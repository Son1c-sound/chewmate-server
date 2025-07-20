import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ImageAnalysisRequest {
  image: string;
}

interface TotalNutrition {
  food_names: string[];
  quantity: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

interface NutritionInfo {
  total: TotalNutrition;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageAnalysisRequest = await request.json();
    const { image } = body;

    // Validate required fields
    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Validate image format
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected base64 data URL' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image and provide nutritional information in JSON format.
              
              Identify all food items visible and calculate the TOTAL nutritional values for the entire meal:
              - total.food_names = array of food names (e.g., ["salmon", "asparagus", "tomatoes"])
              - total.quantity = "combined meal" 
              - total.calories = total calories for entire meal
              - total.carbs = total carbohydrates in grams for entire meal
              - total.fat = total fat in grams for entire meal
              - total.protein = total protein in grams for entire meal
              
              For the message field, provide a brief description like: "Grilled salmon with asparagus and cherry tomatoes - a healthy, protein-rich meal"
              
              DO NOT provide individual food item breakdowns - only the total values and food names array.
              
              Return the response as a JSON object with this structure:
              {
                "total": {
                  "food_names": ["food1", "food2", "food3"],
                  "quantity": "combined meal",
                  "calories": 0,
                  "carbs": 0,
                  "fat": 0,
                  "protein": 0
                },
                "message": "Brief meal description"
              }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let nutritionInfo: NutritionInfo;
    try {
      nutritionInfo = JSON.parse(responseText);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Could not parse nutritional data',
          raw_response: responseText,
          message: 'AI analysis completed but JSON parsing failed',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(nutritionInfo);
  } catch (error) {
    console.error('Error analyzing food:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 