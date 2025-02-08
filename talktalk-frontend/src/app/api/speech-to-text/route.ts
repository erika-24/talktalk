// app/api/speech-to-text/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  //   const formData = await req.formData();
  const { url } = await req.json();
  //   console.log("F", body);
  const subscriptionKey = process.env.SPEECH_KEY;
  //   console.log("formData", formData);
  //   console.log("CONTENT", formData.get("content"));
  const region = "eastus";
  //   cognitiveservices.azure.com/stt/speech/recognition/conversation/cognitiveservices/v1?language=en-US
  const speechApiUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;
  try {
    const response = await fetch(speechApiUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey || "",
        "Content-Type": "audio/wav",
      },
      body: url, // formData.get("content"),
    });
    console.log(response);
    const data = await response.json();
    return NextResponse.json({ transcript: data.DisplayText });
  } catch (err) {
    console.log(err);
  }
}
