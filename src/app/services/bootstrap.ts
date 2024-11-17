"use server";

import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { v4 as uuidv4 } from "uuid";
import path from "path";

import { createIndexIfNecessary, pineconeIndexHasVectors } from "./pinecone";

import { type Document } from "../types/document";
import { promises as fs } from "fs";
import { extractKeywords } from "@/lib/utils";

export const readMetadata = async (): Promise<Document["metadata"][]> => {
  try {
    const filePath = path.resolve(process.cwd(), "docs/db.json");
    const data = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(data);
    return parsed.documents || [];
  } catch (error) {
    console.warn("Could not read metadata from db.json:", error);
    return [];
  }
};

// Prepare metadata for upsert to Pinecone - Langchain's PDF loader adds some
// fields that we want to remove before upserting to Pinecone, because Pinecone
// requires that metadata is a string, number or array (not an object)
const flattenMetadata = (metadata: any): Document["metadata"] => {
  const flatMetadata = { ...metadata };
  if (flatMetadata.pdf) {
    if (flatMetadata.pdf.pageCount) {
      flatMetadata.totalPages = flatMetadata.pdf.pageCount;
    }
    delete flatMetadata.pdf;
  }
  if (flatMetadata.loc) {
    delete flatMetadata.loc;
  }
  return flatMetadata;
};

// Function to batch upserts
const batchUpserts = async (
  index: any,
  vectors: any[],
  batchSize: number = 50
) => {
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    console.log(`Upserting batch ${i + 1} of ${batch.length} vectors...`);
    await index.upsert(batch);
  }
};

export const initiateBootstrapping = async (targetIndex: string) => {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT}`;

  // Initiate a POST request with fetch to the /ingest endpoint, in order to begin
  // chunking, embedding and upserting documents that will form the knowledge base
  const response = await fetch(`${baseUrl}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetIndex }),
  });
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
};

// Add content validation function
const isValidContent = (content: string): boolean => {
  if (!content || typeof content !== "string") return false;
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length < 8192; // Voyage typically has a max token limit
};

// Move textSplitter to module scope
const createTextSplitter = () => new RecursiveCharacterTextSplitter({
  chunkSize: 200000,
  chunkOverlap: 400000,
  separators: ["\n\n", "\n", " ", ""], // More granular splitting
  lengthFunction: (text) => text.length,
});
const processDocument = async (doc: any, metadata: any) => {
  const textSplitter = createTextSplitter();
  const splits = await textSplitter.splitDocuments([doc]);
  
  return splits.map((split: { pageContent: string; }, index: number) => ({
    ...split,
    metadata: {
      ...flattenMetadata(metadata),
      id: uuidv4(),
      chunkIndex: index,
      totalChunks: splits.length,
      previousChunk: index > 0 ? splits[index - 1].pageContent : null,
      nextChunk: index < splits.length - 1 ? splits[index + 1].pageContent : null,
      contentLength: split.pageContent.length,
      summary: split.pageContent.substring(0, 1000),
      keywords: extractKeywords(split.pageContent),
      documentContext: {
        before: index > 0 ? splits[index - 1].pageContent : null,
        after: index < splits.length - 1 ? splits[index + 1].pageContent : null,
      }
    }
  }));
};

export const handleBootstrapping = async (targetIndex: string) => {
  try {
    console.log(
      `Running bootstrapping procedure against Pinecone index: ${targetIndex}`
    );

    await createIndexIfNecessary(targetIndex);
    const hasVectors = await pineconeIndexHasVectors(targetIndex);

    if (hasVectors) {
      console.log(
        "Pinecone index already exists and has vectors in it - returning early"
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.log("Loading documents and metadata...");

    const docsPath = path.resolve(process.cwd(), "docs/");
    const loader = new DirectoryLoader(docsPath, {
      ".pdf": (filePath: string) => new PDFLoader(filePath),
    });

    const documents = await loader.load();
    if (documents.length === 0) {
      console.warn("No PDF documents found in docs directory");
      return NextResponse.json(
        { error: "No documents found" },
        { status: 400 }
      );
    }

    const metadata = await readMetadata();

    // Process each document with enhanced context
    const processedDocuments = [];
    for (const doc of documents) {
      const fileMetadata = metadata.find(
        (meta) => meta.filename === path.basename(doc.metadata.source)
      );
      if (fileMetadata && isValidContent(doc.pageContent)) {
        const processed = await processDocument(doc, {
          ...doc.metadata,
          ...fileMetadata,
          pageContent: doc.pageContent,
        });
        processedDocuments.push(...processed);
      }
    }

    console.log(`Processed ${processedDocuments.length} document chunks`);

    // Process in smaller batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < processedDocuments.length; i += BATCH_SIZE) {
      const batch = processedDocuments.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
          processedDocuments.length / BATCH_SIZE
        )}`
      );

      try {
        // Generate embeddings
        const voyageEmbeddings = new VoyageEmbeddings({
          apiKey: process.env.VOYAGE_API_KEY,
          inputType: "document",
          modelName: "voyage-law-2",
        });

        const pageContents = batch.map((doc) => doc.pageContent);
        console.log(`Generating embeddings for ${pageContents.length} chunks`);

        const embeddings = await voyageEmbeddings.embedDocuments(pageContents);

        if (!embeddings || embeddings.length !== pageContents.length) {
          console.error("Invalid embeddings response", {
            expected: pageContents.length,
            received: embeddings?.length,
          });
          continue;
        }

        // Create vectors with enhanced metadata
        const vectors = batch.map((doc, index) => ({
          id: doc.metadata.id!,
          values: embeddings[index],
          metadata: doc.metadata,
        }));

        // Upsert to Pinecone
        const pc = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY!,
        });

        const index = pc.Index(targetIndex);
        await batchUpserts(index, vectors, 2);

        // Add delay between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
          {
            error: error instanceof Error ? error.message : "Unknown error",
            batchSize: batch.length,
          }
        );
        continue;
      }
    }

    console.log("Bootstrap procedure completed successfully.");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error during bootstrap procedure:", {
      message: error.message,
      cause: error.cause?.message,
      stack: error.stack,
    });

    if (error.code === "UND_ERR_CONNECT_TIMEOUT") {
      return NextResponse.json(
        { error: "Operation timed out - please try again" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Bootstrap procedure failed" },
      { status: 500 }
    );
  }
};
