import express from "express";
import {
  extractAnswers,
  generatePostObs,
  getConfig,
  type Question,
  type Screenshot,
} from "./openai.js";

const PORT = parseInt(process.env.CS_PORT_API ?? "10811", 10);

const app = express();
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (_req, res) => {
  try {
    const { baseUrl, model } = getConfig();
    res.json({
      status: "ok",
      service: "cs-openai-sidecar",
      baseUrl,
      model,
    });
  } catch (e) {
    res.status(500).json({
      status: "config-error",
      service: "cs-openai-sidecar",
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.post("/api/extract-lesson", async (req, res) => {
  try {
    const screenshots = req.body?.screenshots as Screenshot[];
    const questions = req.body?.questions as Question[];
    const lessonPlanText = req.body?.lessonPlanText as string | undefined;
    if (!Array.isArray(screenshots) || !Array.isArray(questions)) {
      return res
        .status(400)
        .json({ status: "failed", errorMessage: "Body must include `screenshots[]` and `questions[]`." });
    }
    const result = await extractAnswers(screenshots, questions, lessonPlanText);
    res.json({ status: "ok", answers: result.answers });
  } catch (e) {
    res.status(500).json({
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }
});

app.post("/api/generate-postobs", async (req, res) => {
  try {
    const preAnswers = req.body?.preAnswers as Record<string, string>;
    const postQuestions = req.body?.postQuestions as Question[];
    const lessonPlanText = req.body?.lessonPlanText as string | undefined;
    const existingPostObs = req.body?.existingPostObs as
      | Record<string, string>
      | undefined;
    if (
      !preAnswers ||
      typeof preAnswers !== "object" ||
      !Array.isArray(postQuestions)
    ) {
      return res.status(400).json({
        status: "failed",
        errorMessage: "Body must include `preAnswers` object and `postQuestions[]`.",
      });
    }
    const result = await generatePostObs({
      preAnswers,
      postQuestions,
      lessonPlanText,
      existingPostObs,
    });
    res.json({ status: "ok", answers: result.answers });
  } catch (e) {
    res.status(500).json({
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[cs-openai-sidecar] listening on http://localhost:${PORT}`);
});
