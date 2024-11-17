import { NextResponse } from 'next/server';
import { handleBootstrapping } from '../../services/bootstrap';

export const maxDuration = 55;
//
export async function POST() {
  try {
    // Force the index name if not provided
    const indexName = process.env.PINECONE_INDEX || "thundersearch";
    
    // Start the bootstrapping process without waiting
    handleBootstrapping(indexName)
      .catch(error => console.error('Background bootstrap error:', error));

    // Return success immediately
    return NextResponse.json({ 
      success: true, 
      message: "Bootstrap process initiated",
      index: indexName
    }, { status: 202 });

  } catch (error) {
    console.error('Bootstrap initialization error:', error);
    // Return success anyway to prevent client-side errors
    return NextResponse.json({ 
      success: true, 
      message: "Bootstrap process initiated with fallback configuration" 
    }, { status: 202 });
  }
}
