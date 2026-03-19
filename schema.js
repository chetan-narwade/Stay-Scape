const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),

        // ✅ allow image key (handled by multer, not Joi)
        image: Joi.object({
            filename: Joi.string().allow("", null),
            url: Joi.string().allow("", null),
        }).optional(),

        price: Joi.number().min(0).required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        category: Joi.string().allow("", null)
    }).required()
});



module.exports.reviewSchema = Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().required()
});