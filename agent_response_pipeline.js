import fs from 'fs/promises';
import fetch from 'node-fetch';

const elixpoEndpoint = "https://txtelixpo.vercel.app/agents";
const AGENT_TIMEOUT_MS = 90000; 

function withTimeout(promise, ms, agentName = "Agent") {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${agentName} timed out after ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}


// if you wanna send questions from a big data table or a json catalog just ommit the portions of agent 3 and 4, since they are 
//general questions and role based questions 
async function agentPipelineSequence(prompt, toolName, toolDesc, toolParams) {
  try {
    const res = await fetch(elixpoEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "function",
            function: {
              name: toolName,
              description: toolDesc,
              parameters: toolParams
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`elixpo API Error (${res.status}): ${errorText}`);
      return null;
    }

    const data = await res.json();
    const toolCalls = data?.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      return JSON.parse(toolCalls[0].function.arguments);
    }

    return null;

  } catch (error) {
    console.error("elixpo request failed:", error.message);
    return null;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Agents
async function extractResumeDetails(resumeText) {
  console.log("Agent 1: Extracting resume info...");
  return await agentPipelineSequence(
    `Extract skills, domain, technologies, and projects from:\n${resumeText}`,
    "extract_resume_info",
    "Extracts key information from a resume text.",
    {
      type: "object",
      properties: {
        technologies: { type: "string" },
        strengths: { type: "string" },
        domain: { type: "string" },
        summary: { type: "string" }
      },
      required: ["technologies", "domain", "summary"]
    }
  );
}

async function detectMismatch(resumeSummary, jobDescription) {
  console.log("Agent 2: Detecting mismatch...");
  return await agentPipelineSequence(
    `Resume Info:\n${resumeSummary}\n\nJob Description:\n${jobDescription}`,
    "detect_mismatch",
    "Checks for role mismatch between resume and job description.",
    {
      type: "object",
      properties: {
        mismatchNote: { type: "string", description: "Summary of mismatch if any" }
      },
      required: ["mismatchNote"]
    }
  );
}

async function getGeneralQuestions() {
  console.log("Agent 3: Generating general questions...");
  return await agentPipelineSequence(
    `Generate 10 general interview questions with importance and weightage.`,
    "generate_general_questions",
    "Generates general interview questions.",
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              importance: { type: "string", enum: ["High", "Medium", "Low"] },
              weightage: { type: "number" }
            },
            required: ["question", "importance", "weightage"]
          }
        }
      },
      required: ["questions"]
    }
  );
}

async function getRoleSpecificQuestions(jobDescription) {
  console.log("Agent 4: Creating role-specific questions...");
  return await agentPipelineSequence(
    `Create 20 questions from this job description:\n${jobDescription}`,
    "generate_role_questions",
    "Generates role-specific interview questions.",
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              importance: { type: "string", enum: ["High", "Medium", "Low"] },
              weightage: { type: "number" }
            },
            required: ["question", "importance", "weightage"]
          }
        }
      },
      required: ["questions"]
    }
  );
}

async function getResumeBasedQuestions(resumeHighlights) {
  console.log("Agent 5: Generating resume-based questions...");
  return await agentPipelineSequence(
    `Based on this resume:\n${resumeHighlights}\nGenerate 5–10 questions.`,
    "generate_resume_questions",
    "Generates questions from resume projects or tech stack.",
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              importance: { type: "string", enum: ["High", "Medium", "Low"] },
              weightage: { type: "number" }
            },
            required: ["question", "importance", "weightage"]
          }
        }
      },
      required: ["questions"]
    }
  );
}

function compileInterviewTable(general, role, resume, mismatchNote, roleTitle) {
  console.log("Agent 6: Compiling final interview table...");

  const formatSet = (qs, type) =>
    qs.map(q => ({
      ...q,
      type
    }));

  const final = {
    role: roleTitle,
    note: mismatchNote,
    questions: [
      ...formatSet(general.questions, "general"),
      ...formatSet(role.questions, "role"),
      ...formatSet(resume.questions, "resume")
    ]
  };

  return JSON.stringify(final, null, 2);
}

async function generateInterview(resumeFilePath, jobDescription, jobRole) {
  console.log("Starting Interview Agent Pipeline...");
  const resumeText = await fs.readFile(resumeFilePath, "utf-8");

  try {

    // const helloWorld = await withTimeout(
    //   agentPipelineSequence(
    //     "Hello World",
    //     "hello_world",
    //     "A simple hello world function.",
    //     {}
    //   ),
    //   AGENT_TIMEOUT_MS,
    //   "Agent 0: Hello World"
    // );
    const resumeInfo = await withTimeout(
      extractResumeDetails(resumeText),
      AGENT_TIMEOUT_MS,
      "Agent 1: Resume Extraction"
    );
    console.table(resumeInfo);
    await delay(1000);

    const mismatch = await withTimeout(
      detectMismatch(resumeInfo.summary, jobDescription),
      AGENT_TIMEOUT_MS,
      "Agent 2: Mismatch Detection"
    );
    console.table(mismatch);
    await delay(1000);

    const generalQs = await withTimeout(
      getGeneralQuestions(),
      AGENT_TIMEOUT_MS,
      "Agent 3: General Questions"
    );
    console.table(generalQs);
    await delay(1000);

    const roleQs = await withTimeout(
      getRoleSpecificQuestions(jobDescription),
      AGENT_TIMEOUT_MS,
      "Agent 4: Role-Specific Questions"
    );
    console.table(roleQs);
    await delay(1000);

    const resumeQs = await withTimeout(
      getResumeBasedQuestions(resumeInfo.summary),
      AGENT_TIMEOUT_MS,
      "Agent 5: Resume-Based Questions"
    );
    console.table(resumeQs);
    await delay(1000);

    const final = compileInterviewTable(generalQs, roleQs, resumeQs, mismatch.mismatchNote, jobRole);
    console.log("\nFinal Interview Table:\n", final);
  } catch (err) {
    console.error("Pipeline failed:", err.message);
  }
}

generateInterview(
  "./resume_ocr_output.txt",
  `
We are hiring a Frontend Developer proficient in React, HTML, CSS, Tailwind, and JavaScript.
Experience with responsive design and API integration is a plus.
  `,
  "Java Developer"
);
