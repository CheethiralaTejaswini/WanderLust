const express = require("express");
const router = express.Router();
router.get("/",(req,res) =>{
    res.send("Get for posts")
});
//show route
router.get("/:id",(req,res) =>{
    res.send("Get for show posts")
});
//post route
router.post("/",(req,res) =>{
    res.send("post for show posts")
});
//delete-users
//show route
router.delete("/:id",(req,res) =>{
    res.send("delete for show posts")
});
module.exports=router;
