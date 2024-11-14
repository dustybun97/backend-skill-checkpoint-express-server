import express from "express";
import cors from "cors";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});
/////Search questions by title or category
app.get("/questions/search", async (req, res) => {
  const { title, category } = req.query;
  console.log("Received title:", title);
  console.log("Received category:", category);
  if (
    (!title && !category) ||
    (title && typeof title !== "string") ||
    (category && typeof category !== "string")
  ) {
    return res.status(400).json({
      message: "Invalid search parameters.",
    });
  }
  try {
    let results = [];
    if (title && category) {
      results = await connectionPool.query(
        `select * from questions where title like $1 and category like $2`,
        [`%${title}%`, `%${category}%`]
      );
    } else if (title) {
      results = await connectionPool.query(
        `select * from questions where title like $1`,
        [`%${title}%`]
      );
    } else if (category) {
      results = await connectionPool.query(
        `select * from questions where category LIKE $1`,
        [`%${category}%`]
      );
    }
    if (results.rows.length === 0) {
      return res.status(404).json({
        message: "No questions found matching the search criteria.",
      });
    }
    return res.status(200).json({
      data: results.rows,
    });
  } catch (error) {
    console.log("211------------------", error);

    return res.status(500).json({ message: "Unable to fetch a question." });
  }
});
///////////////POST////////////////////
//Create a new question
app.post("/questions", async (req, res) => {
  const newQuestion = req.body;
  try {
    const query = `insert into questions (title,description,category)
    values ($1, $2, $3)`;
    const values = [
      newQuestion.title,
      newQuestion.description,
      newQuestion.category,
    ];
    await connectionPool.query(query, values);

    if (!newQuestion) {
      return res.status(400).json({
        message: "Invalid request data.",
      });
    }
    if (!newQuestion.title) {
      return res.status(400).json({
        message: "Title is required.",
      });
    }
    if (!newQuestion.description) {
      return res.status(400).json({
        message: "Description is required.",
      });
    }
    if (!newQuestion.category) {
      return res.status(400).json({
        message: "Category is required.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to create question." });
  }
  return res.status(201).json({ message: "Question created successfully." });
});
/////Get a question by ID
app.get("/questions/:id", async (req, res) => {
  const questionIdFromClient = req.params.id;
  try {
    const results = await connectionPool.query(
      `select * from questions where id = $1`,
      [questionIdFromClient]
    );
    if (!results.rows[0]) {
      return res.status(404).json({
        message: `Question not found. (question id: ${questionIdFromClient})`,
      });
    }
    return res.status(200).json({ data: results.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to fetch questions" });
  }
});
/////Get all questions
app.get("/questions", async (req, res) => {
  let results;
  try {
    results = await connectionPool.query(`select * from questions`);
    return res.status(200).json({
      data: results.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to fetch questions." });
  }
});
/////Update a question by ID
app.put("/questions/:id", async (req, res) => {
  const questionIdFromClient = req.params.id;
  const updatedQuestion = req.body;
  try {
    const checkQuestionId = await connectionPool.query(
      `
      select * from questions where id = $1`,
      [questionIdFromClient]
    );
    if (checkQuestionId.rows.length === 0) {
      return res.status(404).json({
        message: `Question ID: ${questionIdFromClient} not found.`,
      });
    }
    await connectionPool.query(
      `update questions set
        title = $2,
        category = $3,
        description = $4
        where id = $1
        `,
      [
        questionIdFromClient,
        updatedQuestion.title,
        updatedQuestion.category,
        updatedQuestion.description,
      ]
    );
    if (!updatedQuestion.title) {
      return res.status(400).json({
        message: "Invalid request data. Title is required.",
      });
    }
    if (!updatedQuestion.description) {
      return res.status(400).json({
        message: "Invalid request data. Description is required.",
      });
    }
    if (!updatedQuestion.category) {
      return res.status(400).json({
        message: "Invalid request data. Category is required.",
      });
    }

    return res.status(200).json({ message: "Question updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to fetch question." });
  }
});
/////Delete a question by ID
app.delete("/questions/:id", async (req, res) => {
  const questionIdFromClient = req.params.id;
  try {
    await connectionPool.query(`delete from questions where id = $1`, [
      questionIdFromClient,
    ]);
    const checkQuestionId = await connectionPool.query(
      `
      select * from questions where id = $1`,
      [questionIdFromClient]
    );
    if (checkQuestionId.rows.length === 0) {
      return res.status(404).json({
        message: `Question ID: ${questionIdFromClient} not found.`,
      });
    }
    return res
      .status(200)
      .json({ message: "Question post has been deleted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to delete question." });
  }
});
///////////////////ANSWER///////////////////////
/////Create an answer for a question
app.post("/questions/:id/answers", async (req, res) => {
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
app.get("/questions/:id/answers", async (req, res) => {
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
app.delete("/questions/:id/answers", async (req, res) => {
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
