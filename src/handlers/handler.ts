import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import { BlogType, CommentType, UserType } from "../schema/schema";
import User from "../models/User";
import Blog from "../models/Blog";
import Comment from "../models/Comment";
import { Document } from "mongoose";
import { compareSync, hashSync } from "bcryptjs";

const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  fields: {
    // get all user
    users: {
      type: GraphQLList(UserType),
      async resolve() {
        return await User.find();
      },
    },
    // get all blogs
    blogs: {
      type: GraphQLList(BlogType),
      async resolve() {
        return await Blog.find();
      },
    },
    // get all comments
    comments: {
      type: GraphQLList(CommentType),
      async resolve() {
        return await Comment.find();
      },
    },
  },
});

const mutations = new GraphQLObjectType({
  name: "mutations",
  fields: {
    // user signup
    signup: {
      type: UserType,
      args: {
        name: { type: GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLNonNull(GraphQLString) },
        password: { type: GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, { name, email, password }) {
        let existingUser: Document<any, any, any>;
        try {
          existingUser = await User.findOne({ email: email });
          if (existingUser) return new Error("User Already Exists");
          const encryptedPassword = hashSync(password);
          const user = new User({ name, email, password: encryptedPassword });
          return await user.save();
        } catch (err) {
          return new Error("User Signup Failed");
        }
      },
    },
    // user login
    login: {
      type: UserType,
      args: {
        email: { type: GraphQLNonNull(GraphQLString) },
        password: { type: GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, { email, password }) {
        let existingUser: Document<any, any, any>;
        try {
          existingUser = await User.findOne({ email });
          if (!existingUser)
            return new Error("No user registered with this email");
          const decryptedPassword = compareSync(
            password,
            //@ts-ignore
            existingUser?.password
          );
          if (!decryptedPassword) return new Error("Incorrect password");
          return existingUser;
        } catch (err) {
          return new Error(err);
        }
      },
    },
    // create blog
    addblog: {
      type: BlogType,
      args: {
        title: { type: GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLNonNull(GraphQLString) },
        date: { type: GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, { title, content, date }) {
        let blog: Document<any, any, any>;
        try {
          blog = new Blog({ title, content, date });
          return await blog.save();
        } catch (error) {
          return new Error(error);
        }
      },
    },
    // update blog
    updateBlog: {
      type: BlogType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, { id, title, content }) {
        let existingBlog: Document<any, any, any>;
        try {
          existingBlog = await Blog.findById(id);
          if (!existingBlog) return new Error("Blog does not exist");
          return await Blog.findByIdAndUpdate(
            id,
            {
              title,
              content,
            },
            { new: true }
          );
        } catch (error) {
          return new Error(error);
        }
      },
    },
    // delete blog
    deleteBlog: {
      type: BlogType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, { id }) {
        let existingBlog: Document<any, any, any>;
        try {
          existingBlog = await Blog.findById(id);
          if (!existingBlog) return new Error("Blog does not exist");
          return Blog.findByIdAndDelete(id);
        } catch (error) {
          return new Error(error);
        }
      },
    },
  },
});

export default new GraphQLSchema({ query: RootQuery, mutation: mutations });
