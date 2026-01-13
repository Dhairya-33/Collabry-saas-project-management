import mongoose,{Schema} from 'mongoose';

const projectInviteSchema = new Schema({
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  inviterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  reason: {
    type: String, 
    default: null
  }
}, { 
  timestamps: true
});

projectInviteSchema.index(
  { projectId: 1, inviteeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);


export const ProjectInvite = mongoose.model('ProjectInvite', projectInviteSchema);
