const { Router } = require('express')
const fs = require('fs/promises')
const path = require('path')
const { uploadAvatar, uploadDocuments, uploadToMemory } = require('../middleware/upload')

const router = Router()

function handleUploadError(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large' })
  if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Too many files' })
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Unexpected field' })
  if (err.message) return res.status(400).json({ error: err.message })
  next(err)
}

router.post('/avatar', uploadAvatar.single('avatar'), handleUploadError, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.status(201).json({
    message: 'Avatar uploaded',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/avatars/${req.file.filename}`
    }
  })
})

router.post('/documents', uploadDocuments.array('documents', 5), handleUploadError, (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files' })
  const files = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    url: `/uploads/documents/${file.filename}`
  }))
  res.status(201).json({ message: `Uploaded: ${files.length}`, files })
})

router.post('/profile', uploadAvatar.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), handleUploadError, (req, res) => {
  const { name, bio } = req.body
  const avatar = req.files?.avatar?.[0]
  const cover = req.files?.cover?.[0]
  if (!name) return res.status(400).json({ error: 'Name required' })
  res.status(201).json({
    message: 'Profile updated',
    profile: {
      name,
      bio: bio || '',
      avatar: avatar ? `/uploads/avatars/${avatar.filename}` : null,
      cover: cover ? `/uploads/avatars/${cover.filename}` : null
    }
  })
})

router.post('/image/process', uploadToMemory.single('image'), handleUploadError, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const base64 = req.file.buffer.toString('base64')
  res.json({
    message: 'In memory',
    size: req.file.size,
    preview: `data:${req.file.mimetype};base64,${base64.substring(0, 50)}...`
  })
})

router.delete('/:folder/:filename', async (req, res) => {
  const { folder, filename } = req.params
  const allowedFolders = ['avatars', 'documents']
  if (!allowedFolders.includes(folder)) return res.status(400).json({ error: 'Invalid folder' })
  
  const safeName = path.basename(filename)
  const filePath = path.join('uploads', folder, safeName)
  
  try {
    await fs.unlink(filePath)
    res.json({ message: 'Deleted' })
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    throw err
  }
})

module.exports = router