const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const MONDAY_API_URL = 'https://api.monday.com/v2';
  const API_KEY = process.env.MONDAY_API_KEY;
  const DEST_WORKSPACE_ID = process.env.DEST_WORKSPACE_ID;

  const payload = req.body;
  const itemId = payload.event.pulseId;

  try {
    const query = \`
      query {
        items(ids: \${itemId}) {
          name
          board {
            id
            workspace_id
          }
          group {
            id
          }
          column_values {
            id
            text
            value
          }
        }
      }
    \`;

    const response = await axios.post(MONDAY_API_URL, { query }, {
      headers: { Authorization: API_KEY }
    });

    const item = response.data.data.items[0];
    const stato = item.column_values.find(c => c.id === 'stato_cantiere')?.text;
    const spunta = JSON.parse(item.column_values.find(c => c.id === 'spunta')?.value || 'false');
    const gruppo = item.group.id;

    if (stato === 'CANTIERE TERMINATO' && spunta && gruppo === 'sviluppo_apertura_palestra') {
      const boardId = item.board.id;

      const mutation = \`
        mutation {
          move_board_to_workspace (board_id: \${boardId}, workspace_id: \${DEST_WORKSPACE_ID}) {
            id
          }
        }
      \`;

      await axios.post(MONDAY_API_URL, { query: mutation }, {
        headers: { Authorization: API_KEY }
      });

      return res.status(200).send('Board moved');
    }

    return res.status(200).send('Conditions not met');
  } catch (err) {
    console.error(err.response?.data || err);
    return res.status(500).send('Error handling webhook');
  }
};