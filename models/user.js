const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const { generateNameAvatar, getAvatarUrl } = require("../utils/avatarHelper.js");

const userSchema = new Schema({
    username: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        trim: true
    },
    avatar: {
        type: String,
        default: function() {
            return generateNameAvatar(this.displayName || this.username || "User");
        }
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    bio: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "host", "admin"],
        default: "user"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Automatically enforce name-based avatar if avatar is missing or generic unsplash
userSchema.pre("save", function() {
    const name = this.displayName || this.username || "User";
    if (!this.avatar || this.avatar.includes("photo-1535713875002-d1d0cf377fde") || this.avatar.trim() === "") {
        this.avatar = generateNameAvatar(name);
    }
});

userSchema.methods.getAvatar = function(size = 200) {
    return getAvatarUrl(this, size);
};

userSchema.virtual("avatarUrl").get(function() {
    return getAvatarUrl(this, 200);
});

// passportLocalMongoose adds username, hash, and salt
// We make password optional for OAuth users so Google authenticated users can be saved without a password hash
userSchema.plugin(
    passportLocalMongoose.default || passportLocalMongoose,
    {
        usernameField: "username",
        hashAdminPassword: false
    }
);

module.exports = mongoose.model("User", userSchema);
