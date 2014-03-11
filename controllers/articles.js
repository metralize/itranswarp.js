// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    sequelize = db.sequelize,
    next_id = db.next_id;

// do management console

function get_categories(req, res) {
    return Category.findAll({
        order: 'display_order'
    }).error(function(err) {
        return res.send(api.server_error(err));
    });
}

function get_category(id, fn, req, res) {
    Category.find(id).error(function(err) {
        return res.send(api.error(err));
    }).success(function(obj) {
        if (! obj) {
            return res.send(api.not_found('category', 'Category not found.'));
        }
        fn(obj);
    });
}

exports = module.exports = {

    'POST /api/articles': function(req, res, next) {
        /**
         * Create a new article.
         * 
         * @return {object} The created article object.
         */
        if ( ! req.user || req.user.role > 0) {
            return res.send(api.notallowed('Permission denied.'));
        }
        var name = req.body.name.trim();
        var description = req.body.description.trim();

        var category_id = req.body.category_id;

        var content = req.body.content;
        var tags = req.body.tags;
        var publish_time = Date.now(); //req.body.publish_time;

        var cover_id = '';
        var article_id = next_id();

        var tasks = {
            category: function(callback) {
                utils.get_category(category_id, function(obj) {
                    callback(null, obj);
                });
            },
            text: function(callback) {
                utils.create_object(Text, { ref_id: article_id, value: content }, tx, function(err, obj) {
                    callback(err, obj);
                });
            },
            article: function(callback) {
                utils.create_object(Article, {
                    id: article_id,
                    user_id: req.user.id,
                    category_id: category_id,
                    cover_id: cover_id,
                    name: name,
                    description: description,
                    publish_time: publish_time
                }, tx, function(err, obj) {
                    callback(err, obj);
                });
            }
        };
        if (cover_id) {
            // TODO: add create cover task:
        }
        sequelize.transaction(function(tx) {
            async.series(tasks, function(err, results) {
                if (err) {
                    return tx.rollback().success(function() {
                        res.send(api.server_error(err));
                    });
                }
                tx.commit().error(function(err) {
                    return res.send(api.server_error(err));
                }).success(function() {
                    return res.send(results.article);
                });
            });
        });
    },

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        utils.get_categories(function(err, array) {
            return res.send(err ? api.server_error(err) : {categories: array});
        });
    },

    'GET /api/categories/:id': function(req, res, next) {
        /**
         * Get categories by id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Category object.
         */
        utils.get_category(req.params.id, function(err, obj) {
            return res.send(err ? api.server_error(err) : obj);
        });
    },

    'POST /api/categories': function(req, res, next) {
        /**
         * Create a new category.
         * 
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        var name = req.body.name.trim();
        var description = req.body.description.trim();

        Category.max('display_order').error(function(err) {
            return res.send(api.server_error(err));
        }).success(function(max_display_order) {
            var display_order = (max_display_order===null) ? 0 : max_display_order + 1;
            Category.create({
                name: name,
                description: description,
                display_order: display_order
            }).error(function(err) {
                return res.send(api.server_error(err));
            }).success(function(cat) {
                return res.send(cat);
            });
        });
    },

    'POST /api/categories/:id': function(req, res, next) {
        /**
         * Update a category.
         * 
         * @param {string} :id - The id of the category.
         * @param {string,optional} name - The new name of the category.
         * @param {string,optional} description - The new description of the category.
         * @return {object} Category object that was updated.
         */
        var name = req.body.name.trim();
        var description = req.body.description.trim();
        util.get_category(req.params.id, function(err, cat) {
            if (err) {
                return res.send(api.server_error(err));
            }
            cat.name = name;
            cat.description = description;
            cat.updateAttributes({
                name: name,
                description: description
            }).error(function(err) {
                return res.send(api.server_error(err));
            }).success(function(cat) {
                return res.send(cat);
            });
        });
    },

    'POST /api/categories/:id/delete': function(req, res, next) {
        /**
         * Delete a category by its id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Results like {"result": true}
         */
        util.get_category(req.params.id, function(err, cat) {
            if (err) {
                return res.send(api.server_error(err));
            }
            console.log('to be deleted category: ' + cat);
            cat.destroy().error(function(err) {
                return res.send(api.server_error(err));
            }).success(function() {
                return res.send({result: true});
            });
        });
    }
}