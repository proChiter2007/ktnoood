const express = require('express')
const path = require('path')
const filesRouter = require('./routes/files')

const app = express()
app.use(express.json())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/upload', filesRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Server error' })
})

app.listen(3000, () => console.log('Server started on port 3000'))