import mongoose from "mongoose"

const experienceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    period: {
        type: String,
        default: ""
    }
}, { _id: true })

const educationSchema = new mongoose.Schema({
    degree: {
        type: String,
        required: true
    },
    institution: {
        type: String,
        required: true
    },
    period: {
        type: String,
        default: ""
    }
}, { _id: true })

const profileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // One profile per user
            index: true
        },
        // Basic Info
        avatar: {
            type: String,
            default: ""
        },
        bio: {
            type: String,
            default: ""
        },
        location: {
            type: String,
            default: ""
        },
        industry: {
            type: String,
            default: ""
        },
        yearsOfExperience: {
            type: String,
            default: ""
        },
        
        // Mentor-specific fields
        hourlyRate: {
            type: String,
            default: ""
        },
        availability: {
            type: String,
            default: ""
        },
        
        // Mentee-specific fields
        careerGoal: {
            type: String,
            default: ""
        },
        
        // Arrays
        skills: [{
            type: String,
            trim: true
        }],
        experience: [experienceSchema],
        education: [educationSchema],
        
        // Stats (can be updated by other services)
        stats: {
            connections: {
                type: Number,
                default: 0
            },
            sessions: {
                type: Number,
                default: 0
            },
            goals: {
                type: Number,
                default: 0
            }
        }
    },
    {
        timestamps: true
    }
)

// Virtual to get user details when querying profile
profileSchema.virtual("userDetails", {
    ref: "User",
    localField: "user",
    foreignField: "_id",
    justOne: true
})

// Method to check if required fields are filled
profileSchema.methods.checkRequiredFields = function() {
    const requiredFields = ['bio', 'location', 'industry']
    const missingFields = requiredFields.filter(field => {
        const value = this[field]
        return !value || value.trim() === ''
    })
    return missingFields
}

// Method to calculate completion percentage
profileSchema.methods.getCompletionPercentage = function() {
    const requiredFields = ['bio', 'location', 'industry']
    const optionalFields = ['yearsOfExperience', 'avatar', 'skills']
    
    // Add role-specific fields
    // Note: We can't access user.role here directly, so we check both
    optionalFields.push('hourlyRate', 'availability', 'careerGoal')
    
    let completed = 0
    let total = requiredFields.length + 2 // +2 for skills and experience/education
    
    requiredFields.forEach(field => {
        if (this[field] && this[field].trim()) completed++
    })
    
    if (this.skills && this.skills.length > 0) completed++
    if (this.experience && this.experience.length > 0) completed++
    
    return Math.round((completed / total) * 100)
}

export const Profile = mongoose.model("Profile", profileSchema)