const express = require("express");
const router = express.Router();

//Index-users
router.get("/",(req,res) =>{
    res.send("Get for users")
});
//show route
router.get("/:id",(req,res) =>{
    res.send("Get for show users")
});
//post route
router.post("/",(req,res) =>{
    res.send("post for show users")
});
//delete-users
//show route
router.delete("/:id",(req,res) =>{
    res.send("delete for show users")
});
module.exports=router;