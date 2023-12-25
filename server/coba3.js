/*
    Dapatkan seluruh board yang dimiliki oleh user (baik sebagai owner maupun sebagai member) 
    saya mau anda menampili nama boardnya, pemiliknya beserta role pemiliknya
    lalu seluruh board yang memang dimiliki user tertentu bisa???
*/
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
      'SELECT b."name" as "BoardName", u."username" as "OwnerName", bm."role" ' +
      'FROM "BoardMembers" bm ' +
      'JOIN "Boards" b ON bm."BoardId" = b."BoardId" ' +
      'JOIN "Users" u ON b."OwnerId" = u."UserId" ' +
      'WHERE bm."UserId" = $1',
      [user.UserId]
    );

    // Menyusun data respons JSON
    const boards = boardsQuery.rows.map((board) => {
      return {
        boardName: board.BoardName,
        ownerName: board.OwnerName,
        role: board.role,
      };
    });

    res.json(boards);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
