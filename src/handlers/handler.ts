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
import { Document, Types, startSession } from "mongoose";
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
        user: { type: GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, { title, content, date, user }) {
        let blog: Document<any, any, any> ;
        const session = await startSession();
        try {
          session.startTransaction({ session });
          blog = new Blog({ title, content, date, user });
          const existingUser = await User.findById(user);
          if (!existingUser) return new Error("User Not Found");
          //@ts-ignore
          existingUser.blogs.push(blog);
          await existingUser.save({ session });
          return await blog.save({ session });
        } catch (error) {
          return new Error(error);
        } finally {
          await session.commitTransaction();
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
        const session = await startSession();
        try {
          session.startTransaction({session});
          existingBlog = await Blog.findById(id).populate("user");
          if (!existingBlog) return new Error("Blog does not exist");
          //@ts-ignore
          const existingUser = existingBlog.user;
          if(!existingUser) return new Error("No user found");
          existingUser.blogs.pull(existingBlog);
          await existingUser.save({session})
          return existingBlog.deleteOne({id: existingBlog.id});
        } catch (error) {
          return new Error(error);
        } finally {
          session.commitTransaction();
        }
      },
    },
    // add comment to a blog
    addCommentToBlog: {
      type: CommentType,
      args: {
        blog: {type: GraphQLNonNull(GraphQLID)},
        user: {type: GraphQLNonNull(GraphQLID)},
        text: {type: GraphQLNonNull(GraphQLString)},
        date: {type: GraphQLNonNull(GraphQLString)},
      },
      async resolve(parent, {user, blog, text, date}) {
        const session = await startSession();
        let comment: Document<any,any,any>;
        try {
          session.startTransaction({session});
          const existingUser = await User.findById(user);
          const existingBlog = await Blog.findById(blog);
          if (!existingUser || !existingBlog)
            return new Error("User or Blog Does not exist");
          comment = new Comment({
            text,
            date,
            blog,
            user,
          });
          //@ts-ignore
          existingUser.comments.push(comment);
          //@ts-ignore
          existingBlog.comments.push(comment);
          await existingBlog.save({session});
          await existingUser.save({session});
          return await comment.save({session});
        } catch (error) {
          return new Error(error);
        } finally{
          session.commitTransaction();
        }
      }
    },
    // delete a comment from a blog
    deleteComment: {
      type: CommentType,
      args: {
        id: {type: GraphQLNonNull(GraphQLID)}
      },
      async resolve(parent, {id}) {
        let comment: any;
        const session = await startSession();
        try {
          session.startTransaction({session});
          comment = await Comment.findById(id);
          if (!comment) return new Error("Comment not Found");
          //@ts-ignore
          const existingUser = await User.findById(comment?.user);
          if (!existingUser) return new Error("User not Found");
          //@ts-ignore
          const existingBlog = await Blog.findById(comment?.blog);
          if(!existingBlog) return new Error("Blog not found");
          existingUser.comments.pull(comment);
          existingBlog.comments.pull(comment);
          await existingUser.save({session});
          await existingBlog.save({session});
          return await comment.deleteOne({id: comment.id});

        } catch (error) {
          return new Error(error);
        } finally{
          await session.commitTransaction();
        }
      }
    }
  },
});

export default new GraphQLSchema({ query: RootQuery, mutation: mutations });
