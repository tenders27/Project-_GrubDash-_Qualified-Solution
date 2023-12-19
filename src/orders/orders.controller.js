const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

const propertiesToValidate = [
    "deliverTo",
    "mobileNumber",
    "dishes"
];

function validateOrder(propertyNames) {
    return function(req, res, next) {
      const { data = {} } = req.body;
      for (const propertyName of propertyNames) {
        if (!data.hasOwnProperty(propertyName)) {
            next({
                status: 400,
                message: `Order must include a '${propertyName}'`,
            });
        } else if ((propertyName == "deliverTo" || propertyName == "mobileNumber") && (data[propertyName] == '' || data[propertyName] == null)) {
            next({
                status: 400,
                message: `Order must include a '${propertyName}'`,
            });
        }

        // Additional checks for the 'dishes' property
        if (propertyName === "dishes") {
            if (!Array.isArray(data.dishes) || data.dishes.length === 0) {
                next({
                    status: 400,
                    message: "Order must include at least one dish",
                });
            }
  
            data.dishes.forEach((dish, index) => {
              if (!dish.hasOwnProperty("quantity") || typeof dish.quantity !== 'number' || dish.quantity <= 0 || !Number.isInteger(dish.quantity)) {
                next({
                    status: 400,
                    message: `Dish ${index} must have a quantity that is an integer greater than 0`,
                });
              }
            });
          } 
        }
      return next();
    };
}

function validateUpdate(req, res, next) {
    const { data = {} } = req.body;
    const { orderId } = req.params;
    const orderToUpdate = res.locals.order;
    const allowedStatuses = ['pending', 'preparing', 'out-for-delivery', 'delivered'];

    // Check if id is in the body and if it matches the orderId from the route
    if (data.id && data.id !== orderId) {
        next({
            status: 400,
            message: `Order id does not match route id. Order: ${data.id}, Route: ${orderId}`,
        });
    }

    // Validate status
    if (!data.status || data.status === '') {
        next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
        });
    }

    // Check if the existing order status is 'delivered'
    if (orderToUpdate.status === 'delivered') {
        next({
            status: 400,
            message: "A delivered order cannot be changed",
        });
    }

    if (!allowedStatuses.includes(data.status)) {
        next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
        });
    }

    next();
}

// TODO: Implement the /orders handlers needed to make the tests pass
function orderExists(req, res, next) {
    const { orderId } = req.params;
    const foundOrder = orders.find(order => order.id === orderId);
    
    if (!foundOrder) {
      return res.status(404).send({ error: `No dish found with id: ${orderId}` });
    }
  
    res.locals.order = foundOrder;
    return next();
  }

function create(req, res, next) {
    const newId = nextId();
    const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
    const newOrder = {
        id: newId,
        deliverTo,
        mobileNumber,
        status: "pending",
        dishes,
    };
    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function list(req, res, next) {
    res.json({ data: orders });
}

function read(req, res) {
    res.status(200).json({ data: res.locals.order });
  }

function update(req, res, next) {
    const orderToUpdate = res.locals.order;
    const { data: { id, deliverTo, mobileNumber, dishes } = {} } = req.body;
    const { orderId } = req.params;
  
      // Check if id is in the body and if it matches the dishId from the route
      if (id && id !== orderId) {
        return res.status(400).send({
          error: `Order id does not match route id. Order: ${id}, Route: ${orderId}`
        });
      }
    
    // Update the dish
    orderToUpdate.deliverTo = deliverTo;
    orderToUpdate.mobileNumber = mobileNumber;
    orderToUpdate.dishes = dishes;

  
    res.json({ data: orderToUpdate})
}

function destroy(req, res, next) {
    const order = res.locals.order;

    // Check if the order's status is not 'pending'
    if (order.status !== "pending") {
        next({
            status: 400,
            message: "An order cannot be deleted unless it is pending",
        });
    }

    // Find the index of the order in the orders array and remove it
    const index = orders.findIndex(o => o.id === order.id);
    orders.splice(index, 1);

    // Send a 204 No Content response
    res.status(204).end();
}

  module.exports = {
    create: [validateOrder(propertiesToValidate), create],
    list,
    read: [orderExists, read],
    update: [orderExists, validateOrder(propertiesToValidate), validateUpdate, update],
    delete: [orderExists, destroy],
  }