/**
 * Build pagination object for Mongoose queries.
 * Returns { content, totalPages, totalElements, page, size }
 * matching the format the frontend expects.
 */
export const paginate = async (Model, filter = {}, options = {}) => {
  const page = Math.max(0, parseInt(options.page) || 0);
  const size = Math.min(50, Math.max(1, parseInt(options.size) || 10));
  const sort = options.sort || { createdAt: -1 };

  const [docs, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(page * size).limit(size).lean(),
    Model.countDocuments(filter)
  ]);

  return {
    content: docs,
    totalPages: Math.ceil(total / size),
    totalElements: total,
    page,
    size
  };
};
