const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const ensureGatewayIndexesAndDedupe = async () => {
  // 1) Deduplicate legacy data so the unique index can be created safely.
  const duplicateGroups = await Transaction.aggregate([
    {
      $match: {
        sessionId: { $type: 'string', $ne: '' },
      },
    },
    {
      $group: {
        _id: '$sessionId',
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;

  for (const group of duplicateGroups) {
    const docs = await Transaction.find({ _id: { $in: group.ids } })
      .select('_id status createdAt completedAt')
      .lean();

    // Prefer keeping a completed transaction; otherwise keep the newest.
    const completed = docs.filter((d) => d.status === 'completed');
    const keep = (completed.length > 0 ? completed : docs)
      .sort((a, b) => {
        const aTime = (a.completedAt || a.createdAt || 0).valueOf?.() ?? 0;
        const bTime = (b.completedAt || b.createdAt || 0).valueOf?.() ?? 0;
        return bTime - aTime;
      })[0];

    const toDelete = docs
      .filter((d) => String(d._id) !== String(keep._id))
      .map((d) => d._id);

    if (toDelete.length > 0) {
      const result = await Transaction.deleteMany({ _id: { $in: toDelete } });
      removed += result.deletedCount || 0;
    }
  }

  if (duplicateGroups.length > 0) {
    console.log(`Gateway dedupe: removed ${removed} duplicate session transactions`);
  }

  // 2) Ensure indexes exist (manual because Transaction autoIndex is disabled).
  await Transaction.collection.createIndex({ status: 1, expiresAt: 1 });
  await Transaction.collection.createIndex(
    { sessionId: 1 },
    { unique: true, sparse: true }
  );
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    await ensureGatewayIndexesAndDedupe();

    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
