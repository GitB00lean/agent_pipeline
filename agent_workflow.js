

import fs from 'fs';
import fetch from 'node-fetch';

const ElixpoEndpoint = "https://text.Elixpo.ai/openai";

async function callElixpo(payload) {
  const res = await fetch(ElixpoEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content;
}

// -------------------- Agent 1: Extract Resume Info --------------------
async function extractResumeDetails(resumeText) {
  const prompt = `Analyze the following resume. Extract key technologies, strengths, domain experience (like frontend/backend), projects, and programming languages:\n\n${resumeText}`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Agent 2: Detect Role Mismatch --------------------
async function detectMismatch(resumeSkills, jobDescription) {
  const prompt = `Given the following extracted resume details:\n${resumeSkills}\n\nAnd the job description:\n${jobDescription}\n\nIs there any mismatch in roles (e.g. resume is backend but applying for frontend)? If yes, give a brief note.`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Agent 3: General Questions --------------------
async function getGeneralQuestions() {
  const prompt = `Generate 10 general technical and behavioral interview questions suitable for any software role.`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Agent 4: Role-Specific Questions --------------------
async function getRoleSpecificQuestions(jobDescription) {
  const prompt = `Based on the job description, generate 20 tailored interview questions:\n\n${jobDescription}`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Agent 5: Resume-Based Questions --------------------
async function getResumeBasedQuestions(resumeSkills) {
  const prompt = `Generate 5–10 additional interview questions based on the candidate's resume:\n\n${resumeSkills}`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Agent 6: Compile Interview Table --------------------
async function compileInterviewTable(generalQs, roleQs, resumeQs, mismatchNote, jobRole) {
  const prompt = `Combine these into an organized interview table JSON format with keys: 'role', 'questions' (with type: general/role/resume), 'note':\n\nGeneral Questions:\n${generalQs}\n\nRole-Specific:\n${roleQs}\n\nResume-Based:\n${resumeQs}\n\nMismatch Note:\n${mismatchNote}\n\nJob Role: ${jobRole}`;
  return await callElixpo({
    model: "openai",
    messages: [{ role: "user", content: prompt }]
  });
}

// -------------------- Main Driver Function --------------------
async function generateInterview(resumeFilePath, jobDescription, jobRole) {
  const resumeText = fs.readFileSync(resumeFilePath, 'utf-8');

  const resumeInfo = await extractResumeDetails(resumeText);
  const mismatchNote = await detectMismatch(resumeInfo, jobDescription);
  const generalQs = await getGeneralQuestions();
  const roleQs = await getRoleSpecificQuestions(jobDescription);
  const resumeQs = await getResumeBasedQuestions(resumeInfo);
  const finalTable = await compileInterviewTable(generalQs, roleQs, resumeQs, mismatchNote, jobRole);

  console.log("\nFinal Interview Table:\n", finalTable);
}

generateInterview("./resume_ocr_output.txt", `
We're hiring a Frontend Developer skilled in HTML, CSS, React.js, Tailwind CSS, API integrations, UI/UX design, and performance optimization.
`, "Frontend Developer");
