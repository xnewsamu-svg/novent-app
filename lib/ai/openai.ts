const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada en las variables de entorno del servidor")
  }
  return { apiKey }
}

export async function callOpenAI(
  systemPrompt: string,
  imageBase64: string,
  maxTokens = 1024,
): Promise<string> {
  const { apiKey } = getOpenAIClient()

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("OpenAI no devolvió contenido en la respuesta")
  }

  return content
}
