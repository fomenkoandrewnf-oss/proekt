const VERTEX_LOCATION = 'us-central1';
const VERTEX_MODEL = 'imagen-3.0';
const MAX_IMAGE_COUNT = 4;

export function generateRoomRefPrompts(prompt: string, count: number) {
  const numericCount = Number.isFinite(count) ? Math.floor(count) : 1;
  const limitedCount = Math.min(Math.max(numericCount, 1), MAX_IMAGE_COUNT);
  return Array.from({ length: limitedCount }, () => prompt);
}

type VertexImagePrediction = {
  bytesBase64Encoded?: string;
  imageBytes?: string;
  base64Encoded?: string;
  image?: {
    bytesBase64Encoded?: string;
    base64Encoded?: string;
    data?: string;
  };
};

type VertexImageResponse = {
  predictions?: VertexImagePrediction[];
  images?: Array<{
    bytesBase64Encoded?: string;
    imageBytes?: string;
    base64?: string;
  }>;
  error?: { message?: string };
};

async function requestVertexImage(projectId: string, token: string, prompt: string) {
  const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateImage`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, mimeType: 'image/png' },
    }),
  });

  const payloadText = await response.text();
  if (!response.ok) {
    let message = payloadText;
    try {
      const parsed = JSON.parse(payloadText);
      message = parsed?.error?.message ?? message;
    } catch {}
    throw new Error(`Vertex AI image generation failed: ${message}`);
  }

  let payload: VertexImageResponse;
  try {
    payload = JSON.parse(payloadText) as VertexImageResponse;
  } catch (error) {
    throw new Error('Vertex AI image generation returned invalid JSON');
  }

  const predictions = payload.predictions ?? [];
  for (const prediction of predictions) {
    const base64 =
      prediction?.bytesBase64Encoded ??
      prediction?.imageBytes ??
      prediction?.base64Encoded ??
      prediction?.image?.bytesBase64Encoded ??
      prediction?.image?.base64Encoded ??
      prediction?.image?.data;
    if (typeof base64 === 'string' && base64.trim()) {
      return base64;
    }
  }

  const images = payload.images ?? [];
  for (const image of images) {
    const base64 = image?.bytesBase64Encoded ?? image?.imageBytes ?? image?.base64;
    if (typeof base64 === 'string' && base64.trim()) {
      return base64;
    }
  }

  throw new Error('Vertex AI did not return image data');
}

export async function generateRoomRefs(prompt: string, count = 4) {
  const token = (process.env.GOOGLE_VERTEX_TOKEN ?? '').trim();
  if (!token) {
    throw new Error('Missing GOOGLE_VERTEX_TOKEN');
  }

  const projectId =
    (process.env.GOOGLE_VERTEX_PROJECT_ID ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      process.env.GCLOUD_PROJECT ??
      process.env.PROJECT_ID ??
      '').trim();

  if (!projectId) {
    throw new Error('Missing GOOGLE_VERTEX_PROJECT_ID');
  }

  const prompts = generateRoomRefPrompts(prompt, count);

  const images = await Promise.all(
    prompts.map((promptText) => requestVertexImage(projectId, token, promptText))
  );

  return images;
}
