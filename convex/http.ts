import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const chat = httpAction(async (ctx, req) => {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    async onFinish({ text }) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
      console.log(text);
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      Vary: "origin",
    },
  });
});

const http = httpRouter();

http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/api/auth/webhook",
  method: "POST",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

// AI Purchase Service endpoint
// Called by the cron job to trigger AI-powered product purchases
http.route({
  path: "/api/ai-purchase",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Verify the request is from a cron job or has the correct admin key
      const body = await request.json();
      const adminKey = body.adminKey || request.headers.get("X-Admin-Key");
      
      if (adminKey !== process.env.ADMIN_KEY) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const BATCH_SIZE = 50;
      const MIN_SPEND_PER_BATCH = 1000000;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      // Fetch all active products
      const products = await ctx.runQuery(api.products.getActiveProducts, {});
      
      if (products.length === 0) {
        return new Response(
          JSON.stringify({ message: "No products found", totalSpent: 0 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Split into batches
      const batches: any[][] = [];
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
      }

      console.log(`Processing ${products.length} products in ${batches.length} batches`);

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

      let totalSpent = 0;
      let totalItems = 0;
      let totalProductsPurchased = 0;
      const allErrors: string[] = [];

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNumber = batchIndex + 1;

        console.log(`Processing batch ${batchNumber}/${batches.length} (${batch.length} products)`);

        // Create AI prompt
        const prompt = `You are an AI representing the general public's purchasing decisions in a marketplace simulation called QuickBuck.

Your role is to make realistic purchasing decisions for ${batch.length} products based on what the general public and businesses would actually buy.

CRITICAL REQUIREMENTS:
1. You MUST spend a MINIMUM of $${MIN_SPEND_PER_BATCH.toLocaleString()} on this batch
2. Give EVERY product a chance - buy at least a small quantity of most products
3. Act like the general public - prioritize useful, quality products that meet real needs
4. Avoid spam, low-quality products, or items that seem suspicious
5. Consider what real consumers and businesses would need

PURCHASING GUIDELINES:
- High-quality products (90-100 quality): Buy more generously
- Medium-quality products (70-89 quality): Buy moderately
- Low-quality products (50-69 quality): Buy sparingly
- Very low quality (<50): Buy minimal amounts or skip if spam

REALISTIC BEHAVIOR:
- Essential products (food, software, services): Higher demand
- Luxury items: Lower but steady demand
- Business-to-business products: Moderate professional demand
- Consumer goods: Mix based on usefulness and price
- Cheap items ($1-$100): Can buy in larger quantities
- Mid-range items ($100-$1000): Moderate quantities
- Expensive items ($1000+): Smaller quantities, must be justified

BATCH INFO:
- This is batch ${batchNumber} of ${batches.length}
- ${batch.length} products to evaluate
- Your minimum budget: $${MIN_SPEND_PER_BATCH.toLocaleString()}

PRODUCTS TO EVALUATE:
${batch.map((p: any, i: number) => `
${i + 1}. "${p.name}" by ${p.companyName}
   - ID: ${p._id}
   - Price: $${p.price.toFixed(2)}
   - Quality: ${p.quality}/100
   - Description: ${p.description.substring(0, 150)}${p.description.length > 150 ? "..." : ""}
   - Tags: ${p.tags.join(", ")}
   - Total Sales History: ${p.totalSales} units
`).join("\n")}

RESPONSE FORMAT (JSON only, no markdown):
Return a JSON array of purchase decisions. Each decision must have:
{
  "productId": "product ID",
  "quantity": number (1-100 for most items, can be higher for very cheap items),
  "reasoning": "brief explanation (1-2 sentences)"
}

IMPORTANT:
- Return valid JSON array only (no markdown code blocks)
- Ensure total spending reaches at least $${MIN_SPEND_PER_BATCH.toLocaleString()}
- Give most products at least 1-5 units to be fair
- Prioritize quality and usefulness in your decisions
- Be realistic - don't buy 100 units of a $10,000 item unless it makes sense`;

        try {
          // Get AI decisions
          const result = await model.generateContent(prompt);
          const response = result.response;
          let text = response.text();

          // Clean up response
          text = text.trim();
          if (text.startsWith("```json")) {
            text = text.substring(7);
          } else if (text.startsWith("```")) {
            text = text.substring(3);
          }
          if (text.endsWith("```")) {
            text = text.substring(0, text.length - 3);
          }
          text = text.trim();

          const decisions = JSON.parse(text);

          // Execute purchases
          const purchases = decisions.map((d: any) => ({
            productId: d.productId,
            quantity: d.quantity,
          }));

          const purchaseResult = await ctx.runMutation(api.products.adminAIPurchase, {
            purchases,
            adminKey: process.env.ADMIN_KEY!,
          });

          totalSpent += purchaseResult.totalSpent;
          totalItems += purchaseResult.totalItems;
          totalProductsPurchased += purchaseResult.productsPurchased;

          if (purchaseResult.errors) {
            allErrors.push(...purchaseResult.errors);
          }

          console.log(`Batch ${batchNumber} complete: $${purchaseResult.totalSpent.toLocaleString()}`);

          // Brief delay between batches
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Error processing batch ${batchNumber}:`, error);
          allErrors.push(`Batch ${batchNumber} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          totalSpent,
          totalItems,
          totalProductsPurchased,
          batchesProcessed: batches.length,
          productsEvaluated: products.length,
          errors: allErrors.length > 0 ? allErrors.slice(0, 10) : undefined,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("AI Purchase Service Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
