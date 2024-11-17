import { NextResponse } from 'next/server';
import { readMetadata } from '@/app/services/bootstrap';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic parameter is required' },
        { status: 400 }
      );
    }

    // Direct file read as fallback if readMetadata fails
    let allDocs;
    try {
      allDocs = await readMetadata();
    } catch (error) {
      // Fallback to direct file read
      const filePath = path.resolve(process.cwd(), "docs/db.json");
      const data = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(data);
      allDocs = parsed.documents || [];
    }

    const relatedDocs = allDocs
      .filter((doc: { topic: any; category: any; }) => {
        const docTopic = (doc.topic || '').toLowerCase();
        const docCategory = (doc.category || '').toLowerCase();
        const searchTopic = topic.toLowerCase();
        
        return docTopic.includes(searchTopic) || 
               docCategory.includes(searchTopic);
      })
      .slice(0, 6)
      .map((doc: { title: any; topic: any; date: any; outcome: any; category: any; }) => ({
        title: doc.title || 'Untitled',
        topic: doc.topic || 'Unknown Topic',
        date: doc.date || 'Unknown Date',
        outcome: doc.outcome || 'No outcome specified',
        category: doc.category || 'Uncategorized'
      }));

    return NextResponse.json({ 
      documents: relatedDocs,
      total: relatedDocs.length 
    });

  } catch (error) {
    console.error('Error in related-documents route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related documents' },
      { status: 500 }
    );
  }
}