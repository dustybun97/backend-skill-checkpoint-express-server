import { Router } from "express";
import connectionPool from "../utils/db.mjs";

const questionRouter = Router();

/////Search questions by title or category
questionRouter.get("/search", async (req, res) => {
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
questionRouter.post("/", async (req, res) => {
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
questionRouter.get("/:id", async (req, res) => {
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
questionRouter.get("/", async (req, res) => {
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
questionRouter.put("/:id", async (req, res) => {
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
questionRouter.delete("/:id", async (req, res) => {
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

export default questionRouter;
