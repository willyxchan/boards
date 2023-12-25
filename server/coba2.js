const express = require('express');
const pool = require('./database/config/pg');

const app = express();
const port = 3000;

app.get('/boards/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Cari user berdasarkan nama username
    const userQuery = await pool.query('SELECT * FROM "Users" WHERE username = $1', [username]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    // Dapatkan seluruh board yang dimiliki oleh user (baik sebagai owner maupun sebagai member)
    const boardsQuery = await pool.query(
      'SELECT b.*, bm.role FROM "BoardMembers" bm JOIN "Boards" b ON bm."BoardId" = b."BoardId" WHERE bm."UserId" = $1',
      [user.UserId]
    );

    // Ekstrak daftar board dari hasil query
    const boards = boardsQuery.rows.map((board) => {
      return {
        ...board,
        members: board.role === 'admin' ? 'admin' : 'member',
        tasks: [],
      };
    });

    // Dapatkan tugas yang dimiliki oleh user dalam setiap board
    for (const board of boards) {
      const tasksQuery = await pool.query(
        'SELECT * FROM "Tasks" WHERE "UserAssignId" = $1 AND "BoardId" = $2',
        [user.UserId, board.BoardId]
      );
      board.tasks = tasksQuery.rows;
    }

    res.json(boards);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
