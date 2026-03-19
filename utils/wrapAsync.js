// ✅ needs wrapAsync — uses await
module.exports.show = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    res.render("listings/show.ejs", { listing });
};

// ✅ does NOT need wrapAsync — no await, nothing to catch
module.exports.new = (req, res) => {
    res.render("listings/new.ejs");
};

// ✅ does NOT need wrapAsync
module.exports.renderLogin = (req, res) => {
    res.render("users/login.ejs");
};

// utils/wrapAsync.js — open this file and confirm it looks exactly like this
module.exports = function wrapAsync(fn) {
    return function (req, res, next) {
        const result = fn(req, res, next);
        if (result && typeof result.catch === "function") {
            result.catch(next);
        }
    };
};