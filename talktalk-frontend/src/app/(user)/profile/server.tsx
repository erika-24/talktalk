'use server'
import { contentAndPronunciationAssessment } from "../../../backend/speech_assessment.js"

export async function assess() {
    return await contentAndPronunciationAssessment("../talktalk-frontend/public/sample_audio/fall_content.wav", `
      Fall is a special and unique season. It marks the beginning of shortened
      days and sunshiney but chilly weather.
      It comes in a burst of color but ushers in the dark, coldness of winter.`, "Describe what fall means to you.")
  }