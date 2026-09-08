export function llmTextResponse(body: string, contentType: string, maxAge = 3600) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`
    }
  });
}
