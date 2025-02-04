const express = require("express");
const { Sequelize, Model, DataTypes } = require("sequelize");
const crypto = require("crypto");

const bodyParser = require("body-parser");
app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const PORT = 3000;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

try {
  sequelize.authenticate();
  console.log("connection has been established.");
} catch (error) {
  console.log("connection to database failed", error);
}

class Url extends Model {}
Url.init(
  {
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: DataTypes.STRING,
  },
  { sequelize, modelName: "Url" }
);

sequelize.sync();

app.get("/", async (req, res) => {
  const all = await Url.findAll();
  if (!all) {
    res.sendStatus(404);
    return;
  }
  res.status(200).send(all);
});

//routes

app.get("/shorten/:code", async (req, res) => {
  const code = req.params.code;
  if (!code) {
    res.send(404).send({ message: "Url not found!" });
    return;
  }

  const originalUrlRecord = await Url.findOne({
    where: {
      code: code,
    },
  });

  if (!originalUrlRecord.url) {
    res.send(404).send({ message: "Url not found!" });
    return;
  }
  res.redirect(301, originalUrlRecord.url);
});

app.post("/shorten", async (req, res) => {
  let body = req.body;
  if (!body.url) {
    res.status(400);
    return;
  }
  const shortCode = getShortCode();
  const newUrl = await Url.create({ url: body.url, code: shortCode });

  const response = {
    message: "new url created!",
    data: newUrl,
  };
  res.status(201).send(response);
});

app.put("/shorten/:code", async (req, res) => {
  const newUrl = req.body.url;
  const reqCode = req.params.code;

  if (!reqCode || !newUrl) {
    res.send(404).send({ message: "Url not found!" });
    return;
  }

  await Url.update(
    { url: newUrl },
    {
      where: {
        code: reqCode,
      },
    }
  );

  const updated = await Url.findOne({ where: { code: reqCode } });

  if (!updated) {
    res.sendStatus(500);
    return;
  }

  res.status(200).send({ message: "resource updated!", data: updated });
});

app.delete("/shorten/:code", async (req, res) => {
  const reqCode = req.params.code;

  if (!reqCode) {
    res.send(404).send({ message: "Url not found!" });
    return;
  }

  const target = await Url.findOne({ where: { code: reqCode } });
  if (!target) {
    res.sendStatus(404);
    return;
  }

  await Url.destroy({ where: { code: reqCode } });
  res.status(200).send({ message: "url deleted!", data: target });
});

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

const getShortCode = () => {
  let randomBytes = crypto.randomBytes(4);
  return "short" + randomBytes.toString("base64url");
};
