import { Router } from "express";
import connectionPool from "../utils/db.mjs";

const answerRouter = Router();

///////////////////ANSWER///////////////////////
/////Create an answer for a question
answerRouter.post("/:id/answers", async (req, res) => {
  try {
    const questionIdFromClient = parseInt(req.params.id);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Invalid request data." });
    }
    const questionQuery = "SELECT * FROM questions WHERE id = $1";
    const questionResult = await connectionPool.query(questionQuery, [
      questionIdFromClient,
    ]);

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    if (content.length > 300) {
      return res.status(404).json({
        message: "Your answers is too long,should less than 300 characters",
      });
    }
    const query =
      "INSERT INTO answers (question_id, content) VALUES ($1, $2) RETURNING *";
    const values = [questionIdFromClient, content];

    const result = await connectionPool.query(query, values);
    const newAnswer = result.rows[0];

    res.status(201).json({
      message: "Answer created successfully",
      answer: newAnswer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create answers." });
  }
});
/////Get answers for a question
answerRouter.get("/:id/answers", async (req, res) => {
  const questionIdFromClient = parseInt(req.params.id);

  try {
    const questionQuery = "SELECT * FROM questions WHERE id = $1";
    const questionResult = await connectionPool.query(questionQuery, [
      questionIdFromClient,
    ]);

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    const answersQuery = "SELECT * FROM answers WHERE question_id = $1";
    const answersResult = await connectionPool.query(answersQuery, [
      questionIdFromClient,
    ]);
    if (answersResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No answers found for this question" });
    }
    return res.status(200).json({
      data: answersResult.rows.map((answer) => ({
        id: answer.id,
        content: answer.content,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to fetch answers." });
  }
});
/////Delete all answers for a question when question is deleted
answerRouter.delete("/:id/answers", async (req, res) => {
  const questionIdFromClient = req.params.id;

  try {
    const deleteAnswersQuery = "DELETE FROM answers WHERE question_id = $1";
    await connectionPool.query(deleteAnswersQuery, [questionIdFromClient]);

    const deleteQuestionQuery = "DELETE FROM questions WHERE id = $1";
    const result = await connectionPool.query(deleteQuestionQuery, [
      questionIdFromClient,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json({
      message: "All answers for the question have been deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete answers." });
  }
});

export default answerRouter;
