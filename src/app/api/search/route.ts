import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { PineconeStore } from "@langchain/pinecone";

export const maxDuration = 60;
export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    // Initialize Pinecone client
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Initialize VoyageEmbeddings with correct inputType for queries
    const voyageEmbeddings = new VoyageEmbeddings({
      apiKey: process.env.VOYAGE_API_KEY,
      inputType: "query",
      modelName: "voyage-3",
    });

    // Initialize PineconeVectorStore
    const vectorStore = new PineconeStore(voyageEmbeddings, {
      pineconeIndex: pc.Index(process.env.PINECONE_INDEX as string),
    });

    console.log(`query is: ${query}`);

    const startTime = Date.now(); // Start time for metrics
    const retrieved = await vectorStore.maxMarginalRelevanceSearch(query, {
      k: 1000,
      fetchK: 10000,
      lambda: 0.8,
      
    });


    const endTime = Date.now(); // End time for metrics
    const timeTaken = endTime - startTime; // Calculate time taken

    // Filter to ensure results set is unique - filter on the metadata.id
    const results: any = retrieved.filter((result, index) => {
      return (
        index ===
        retrieved.findIndex((otherResult: any) => {
          return result.metadata.id === otherResult.metadata.id;
        })
      );
    });

    // Add metrics to the response
    return NextResponse.json({ 
      results, 
      metadata: {
        totalResults: results.length,
        timeTaken: `${timeTaken} ms`, // Time taken for the search
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error performing similarity search:", error);
    return NextResponse.json(
      { error: "Failed to perform similarity search" },
      { status: 500 }
    );
  }
}