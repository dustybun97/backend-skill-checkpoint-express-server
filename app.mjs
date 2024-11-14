import express from "express";
import cors from "cors";
import connectionPool from "./utils/db.mjs";
import questionRouter from "./routes/question.mjs";
import answerRouter from "./routes/answer.mjs";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.use("/questions", questionRouter);
app.use("/questions", answerRouter);

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});

/////////////////VOTE////////////////////////
/////Vote on a question
app.post("/questions/:id/vote", async (req, res) => {
  const questionIdFromClient = req.params.id;
  const { vote } = req.body;

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ message: "Invalid vote value." });
  }

  try {
    const questionCheckQuery = "SELECT id FROM questions WHERE id = $1";
    const questionResult = await connectionPool.query(questionCheckQuery, [
      questionIdFromClient,
    ]);

    if (questionResult.rowCount === 0) {
      return res.status(404).json({ message: "Question not found" });
    }

    const existingVoteQuery =
      "SELECT id FROM question_votes WHERE question_id = $1";
    const existingVoteResult = await connectionPool.query(existingVoteQuery, [
      questionIdFromClient,
    ]);

    if (existingVoteResult.rowCount > 0) {
      const updateVoteQuery =
        "UPDATE question_votes SET vote = $1 WHERE question_id = $2";
      await connectionPool.query(updateVoteQuery, [vote, questionIdFromClient]);
      return res.status(200).json({ message: "Vote updated successfully" });
    } else {
      const insertVoteQuery =
        "INSERT INTO question_votes (question_id, vote) VALUES ($1, $2)";
      await connectionPool.query(insertVoteQuery, [questionIdFromClient, vote]);
      return res.status(201).json({ message: "Vote recorded successfully" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to vote question." });
  }
});
/////Vote on an answer
app.post("/answers/:id/vote", async (req, res) => {
  const answerIdFromClient = req.params.id;
  const { vote } = req.body;
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ message: "Invalid vote value." });
  }

  try {
    const answerCheckQuery = "SELECT id FROM answers WHERE id = $1";
    const answerResult = await connectionPool.query(answerCheckQuery, [
      answerIdFromClient,
    ]);

    if (answerResult.rowCount === 0) {
      return res.status(404).json({ message: "Answer not found" });
    }
    const existingVoteQuery =
      "SELECT id FROM answer_votes WHERE answer_id = $1";
    const existingVoteResult = await connectionPool.query(existingVoteQuery, [
      answerIdFromClient,
    ]);

    if (existingVoteResult.rowCount > 0) {
      const updateVoteQuery =
        "UPDATE answer_votes SET vote = $1 WHERE answer_id = $2";
      await connectionPool.query(updateVoteQuery, [vote, answerIdFromClient]);
      return res.status(200).json({
        message: "Vote on the answer has been recorded successfully.",
      });
    } else {
      const insertVoteQuery =
        "INSERT INTO answer_votes (answer_id, vote) VALUES ($1, $2)";
      await connectionPool.query(insertVoteQuery, [answerIdFromClient, vote]);
      return res.status(200).json({
        message: "Vote on the answer has been recorded successfully.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to vote answer." });
  }
});
/////////////////////////////////////////////
app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
