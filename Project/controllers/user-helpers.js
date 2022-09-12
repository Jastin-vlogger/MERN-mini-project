const User = require('../models/user')
const bcrypt = require('bcrypt')
const Cart = require('../models/userCart')
const Order = require('../models/order')
const { Types, default: mongoose } = require('mongoose')
const Address = require('../models/address')


module.exports = {
    signUp:(userData)=>{
        return new Promise (async(resolve,reject)=>{
            let user = await User.findOne({email:userData.email})
            if (user?.email === userData.email) {
                resolve('email found')
            } else {
              userData.password =await bcrypt.hash(userData.password,10)
            await new User({...userData}).save().then((data)=>{
                resolve(data)
            })  
            } 
        })
    },
    loginValidate:(userData)=>{
        return new Promise (async(resolve,reject)=>{
            let user = await User.findOne({email:userData.email})
            let response = {}
            if (user){
                if(user.blocked){
                    resolve("blocked")
                }else{
                    bcrypt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        response.user = user
                        response.status = true;
                        resolve(response)
                    }else{
                        resolve({status:false})
                    }
                })
                }
            } else {
               resolve(userData)
            }
        })
    },
    blockUser:(id)=>{
        return new Promise (async(resolve,reject)=>{
            await User.findByIdAndUpdate({_id:id},{$set:{blocked : true}}).then((data)=>{
               resolve(data)
            })
        })
    },
    unblockUser:(id)=>{
         return new Promise (async(resolve,reject)=>{
            await User.findByIdAndUpdate({_id:id},{$set:{blocked : false}}).then((data)=>{
                resolve(data)
            })
        })   
    },
    findUser:(email)=>{
        return new Promise (async(resolve,reject)=>{
            await User.findOne({email:email}).then((data)=>{
                resolve(data)
            })
        })
    },
    getCartCount:(userid)=>{
        console.log(userid);
        return new Promise (async(resolve,reject)=>{
            let count = 0
            let cart = await Cart.findOne({user:Types.ObjectId(userid)})
            if(cart){
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(cartId,productId,count,quantity)=>{
        console.log(cartId,productId,count,quantity);
        count = parseInt(count)
        return new Promise (async(resolve,reject)=>{
            if(count == -1 && quantity == 1){
                await Cart.updateOne({'_id':Types.ObjectId(cartId)},
                {
                    $pull:{products:{item:Types.ObjectId(productId)}}
                }).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
              await Cart.updateOne({'_id':Types.ObjectId(cartId),'products.item':Types.ObjectId(productId)},
                    {
                        $inc:{'products.$.quantity':count}
                    }
                    ).then((response)=>{
                        resolve({status:true})
                    })  
            }

            
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise (async(resolve,reject)=>{
            let total = await Cart.aggregate([{
                $match:{user: mongoose.Types.ObjectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:'products',
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,
                    quantity:1,
                    product:{ $arrayElemAt:['$product',0]}
                }
            },
            {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
            
        ])
        if(total[0]){   
            resolve(total[0].total)
        }else{
            resolve('cart is empty')
        }
          
        })
    },
    getEachProductAmount:(userId)=>{
        return new Promise (async(resolve,reject)=>{
            let total = await Cart.aggregate([{
                $match:{user: mongoose.Types.ObjectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:'products',
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,
                    quantity:1,
                    product:{ $arrayElemAt:['$product',0]}
                }
            },
            {
                $project:{
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
            
        ])
        console.log(total);
         resolve(total) 
        })
    },
    placeOrder:(order,products,total,userId)=>{
        return new Promise(async(resolve,reject)=>{
            let status = order.paymentmethod === 'COD'?'placed':'pending'
            let ordersave = {
                deliveryDetails:{
                    address:order.address,
                    state:order.state,
                    pincode:order.pincode
                },
                userId:Types.ObjectId(order.userId),
                paymentMethod:order.paymentmethod,
                products:products,
                status:status,
                totalAmount:total,
                date:new Date()

            }

           await new Order(ordersave).save().then(async(response)=>{
            await Cart.deleteOne({user:Types.ObjectId(userId)})
            resolve(response)
           })
        })
    },
    vieworders:()=>{
        
    },
    viewprofile:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let user = await User.findById(userId)
            resolve(user)
        })
    },
    findaddress:async(userId)=>{
        return new Promise(async(resolve,reject)=>{
         await Address.find({userId:Types.ObjectId(userId)}).then((response)=>{
            resolve(response)
        })   
        })
        
    }
    

    
}