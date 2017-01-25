# Small Orange GraphQL Deferred Executor

This executor pre validate and parse the query and returns a function which once executed, it returns an RxJS Observable with the result. Useful in high performance scenarios, once the query can be pre validated and parsed, and postpone the execution.

## Api
		lazyExecutor(
			schema: GraphQLSchema, 
			query: string): (
				root: object = {};
				context: object = {};
				variables: object = {};
				operationName: string = null
			): Observable<any>;

## Sample
		const {
		    GraphQLSchema,
		    GraphQLObjectType,
		    GraphQLString,
		    GraphQLInt
		} = require('graphql');

		const lazyExecutor = require('smallorange-graphql-lazy-executor');

		const schema = new GraphQLSchema({
		    query: new GraphQLObjectType({
		        name: 'Query',
		        fields: {
		            name: {
		                type: GraphQLString,
		                args: {
		                    age: {
		                        type: GraphQLInt
		                    }
		                },
		                resolve: (root, {
		                    age
		                }, context, info) => {
		                    callback(root, context);

		                    return age ? `${root.name} - ${age}` : root.name;
		                }
		            },
		            dog: {
		                type: GraphQLString,
		                args: {
		                    age: {
		                        type: GraphQLInt
		                    }
		                },
		                resolve: (root, {
		                    age
		                }, context, info) => {
		                    return age ? `${root.dog} - ${age}` : root.dog;
		                }
		            }
		        }
		    }),
		});

		const nameDogQuery = lazyExecutor(schema, `{name, dog}`);

        nameDogQuery({
                name: 'Rohde',
                dog: 'Heron'
            }, {
                context: 'context'
            })
            .subscribe(console.log);

            // will print
            {
            	data: {
	                name: 'Rohde - 20',
	                dog: 'Heron - 3'
	            }
            }
