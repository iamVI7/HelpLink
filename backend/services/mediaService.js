// services/mediaService.js
// Handles media/file processing for requests and SOS.
// Extracted from createRequest — logic is UNCHANGED.

/**
 * Build the media data object from uploaded files.
 *
 * @param {Express.Multer.File[] | undefined} files - req.files
 * @param {boolean} isSOS  - SOS requests are limited to 1 image
 * @param {string|null} userId
 * @returns {{ images: Array<{ url: string }>, uploadedBy: string }}
 */
const buildMediaData = (files, isSOS, userId) => {
  const mediaData = {
    images: [],
    uploadedBy: userId ? 'user' : 'guest',
  };

  if (files && files.length > 0) {
    const limit = isSOS ? 1 : files.length;
    mediaData.images = files.slice(0, limit).map(file => ({ url: file.path }));
  }

  return mediaData;
};

module.exports = { buildMediaData };