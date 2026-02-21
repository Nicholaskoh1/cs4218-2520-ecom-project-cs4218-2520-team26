import mongoose from "mongoose";
import Order from "./orderModel";

describe("Order Model", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/test");
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await Order.deleteMany({});
    });

    describe("Schema Validation", () => {
        test("should create order with valid data", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                payment: { method: "credit_card" },
                buyer: new mongoose.Types.ObjectId(),
                status: "Processing",
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.products).toHaveLength(1);
            expect(order.status).toBe("Processing");
        });

        test("should set default status to 'Not Process'", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.status).toBe("Not Process");
        });

        test("should reject invalid status", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: "Invalid",
            };

             // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order).rejects.toThrow();
        });

        test("should accept all valid status values", async () => {
            // Arrange
            const validStatuses = ["Not Process", "Processing", "Shipped", "deliverd", "cancel"];

            for (const status of validStatuses) {
                // Act
                const order = await Order.create({
                    products: [new mongoose.Types.ObjectId()],
                    buyer: new mongoose.Types.ObjectId(),
                    status,
                });

                // Assert
                expect(order.status).toBe(status);
                await Order.deleteOne({ _id: order._id });
            }
        });

        test("should allow multiple products", async () => {
            // Arrange
            const products = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

            // Act
            const order = await Order.create({
                products,
                buyer: new mongoose.Types.ObjectId(),
            });

            // Assert
            expect(order.products).toHaveLength(2);
        });

        test("should store payment as object", async () => {
            // Arrange
            const payment = { method: "paypal", amount: 100, status: "completed" };

            // Act
            const order = await Order.create({
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                payment,
            });

            // Assert
            expect(order.payment).toEqual(payment);
        });

        test("should create timestamps", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.createdAt).toBeInstanceOf(Date);
            expect(order.updatedAt).toBeInstanceOf(Date);
        });

        test("should allow empty products array", async () => {
            // Arrange
            const orderData = {
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.products).toEqual([]);
        });
    });
});