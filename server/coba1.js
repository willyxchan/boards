const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');
const initModels = require('./database/models/init-models');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(bodyParser.json());

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'wilbert04',
  database: 'project1',
});

// Load models
const models = initModels(sequelize);

// Rute untuk mendapatkan detail board beserta task yang ada di dalamnya
app.get('/getBoardDetails/:userId/:boardId', async (req, res) => {
  try {
    const { userId, boardId } = req.params;

    // Periksa apakah pengguna adalah anggota dari board yang dimaksud
    const isMember = await models.BoardMembers.findOne({
      where: { UserId: userId, BoardId: boardId },
    });

    if (!isMember) {
      return res.status(403).json({ message: "Anda tidak memiliki akses ke board ini" });
    }

    // Dapatkan detail board, nama owner, dan semua task yang terkait dengan board tersebut
    const boardDetails = await models.Boards.findOne({
      where: { BoardId: boardId },
      include: [
        {
          model: models.Users,
          as: "Owner",
          attributes: ["UserId", "username"], // Include the attributes you want
        },
        {
          model: models.Tasks,
          as: "Tasks",
          include: [
            {
              model: models.Users,
              as: "UserAssign",
              attributes: ["UserId", "username"],
            },
          ],
        },
      ],
    });

    res.status(200).json({ boardDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail board" });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});