
import fs from 'fs';
import fetch from 'node-fetch';
const ElixpoEndpoint = "http://10.42.0.56:3000";

async function callElixpo(payload) {
    try {
      const res = await fetch(ElixpoEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Elixpo API Error (${res.status}): ${errorText}`);
        return null; // Return null so we can handle it upstream
      }
  
      const data = await res.json();
      return data?.choices?.[0]?.message?.content;
  
    } catch (error) {
      console.error("Elixpo request failed:", error.message);
      return null;
    }
  }
  

// -------------------- Agent 1: Extract Resume Info --------------------
async function extractResumeDetails(resumeText) {
  console.log("Agent 1: Extracting skills and experience from resume...");
  const prompt = `Analyze the resume below. Extract relevant technologies, strengths, domain experience (e.g., frontend/backend), and summarize:\n\n${resumeText}`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Agent 2: Detect Role Mismatch --------------------
async function detectMismatch(resumeSkills, jobDescription) {
  console.log("Agent 2: Checking for job-role mismatch...");
  const prompt = `Given resume info:\n${resumeSkills}\n\nAnd job description:\n${jobDescription}\n\nIs there any role mismatch? Respond with a short summary.`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Agent 3: General Questions --------------------
async function getGeneralQuestions() {
  console.log("Agent 3: Generating 10 general interview questions...");
  const prompt = `Generate 10 general interview questions and for each, assign an importance level (High/Medium/Low) and a weightage from 1 to 10. Return as a JSON array with keys: question, importance, weightage.`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Agent 4: Role-Specific Questions --------------------
async function getRoleSpecificQuestions(jobDescription) {
  console.log("Agent 4: Creating 20 questions from job description...");
  const prompt = `Based on this job description:\n${jobDescription}\n\nGenerate 20 interview questions with importance and weightage as JSON objects:\n[{"question": "...", "importance": "...", "weightage": ...}]`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Agent 5: Resume-Based Questions --------------------
async function getResumeBasedQuestions(resumeSkills) {
  console.log("Agent 5: Crafting 5–10 resume-based questions...");
  const prompt = `From these resume highlights:\n${resumeSkills}\n\nGenerate 5 to 10 interview questions based on user's projects or technologies. Include importance and weightage.`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Agent 6: Compile Interview Table --------------------
async function compileInterviewTable(generalQs, roleQs, resumeQs, mismatchNote, jobRole) {
  console.log("Agent 6: Compiling all into final interview question table...");
  const prompt = `
You're a backend compiler. Merge the following interview question sets into one unified JSON object with the structure:
{
  "role": "Frontend Developer",
  "note": "<Mismatch Note>",
  "questions": [
    {
      "question": "...",
      "type": "general" | "role" | "resume",
      "importance": "High" | "Medium" | "Low",
      "weightage": 1–10
    }
  ]
}

General Questions:\n${generalQs}
Role-Specific Questions:\n${roleQs}
Resume-Based Questions:\n${resumeQs}
Mismatch Note:\n${mismatchNote}
Job Role: ${jobRole}
`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }],
    seed : 23,
  });
}

// -------------------- Main Driver --------------------
async function generateInterview(resumeFilePath, jobDescription, jobRole) {
  console.log("Starting interview generation pipeline...\n");
  const resumeText = fs.readFileSync(resumeFilePath, 'utf-8');

  const resumeInfo = await extractResumeDetails(resumeText);
  const mismatchNote = await detectMismatch(resumeInfo, jobDescription);
  const generalQs = await getGeneralQuestions();
  const roleQs = await getRoleSpecificQuestions(jobDescription);
  const resumeQs = await getResumeBasedQuestions(resumeInfo);
  const finalTable = await compileInterviewTable(generalQs, roleQs, resumeQs, mismatchNote, jobRole);

  console.log("\n Final Interview Table:\n", finalTable);
}


generateInterview(
  "./resume_ocr_output_two.txt",
  `
We are hiring a Frontend Developer proficient in React, HTML, CSS, Tailwind, and JavaScript.
Experience with responsive design and API integration is a plus.
`,
  "Java Developer"
);
