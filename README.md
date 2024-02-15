# @codeekage/grpc-js

Hello 👋 , welcome to my side project. I built this with the intention that it helps other js developer quickly setup gRPC with Node.js and Typescript.

### Key capabilities:

- Middleware implementation for gRPC - an interceptor
- Request body validation with class-validator
- Single entry load function

### How it works?

```shell
npm i @codeekage/grpc-js
```

The package ships with some essential package to build a well defined and written grpc server application `@grpc/grpc-js` `@grpc/reflection` `class-validator` `grpc-health-check`

## Usage

`server.ts`

```typescript
import 'reflect-metadata'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { GrpcLoader } from '@codeekage/grpc-js'
import { Namespaces, Users } from '@codeekage/proto-lib'
import { HealthImplementation } from 'grpc-health-check'
import { ReflectionService } from '@grpc/reflection'
import { UserController } from './users/user.controller'
import { ProfileController } from './users/profile.controller'
import { KeyExchangeMiddleware } from './middleware/api-key-exchange'

const packageDefinition = protoLoader.loadSync('proto/user/user.proto', {
  includeDirs: ['./node_modules/@codeekage/proto-lib'],
})

const namespace: Namespaces<grpc.ServiceDefinition<Users.rpc>> =
  grpc.loadPackageDefinition(packageDefinition) as any

const server = new grpc.Server()

const grpcLoader = new GrpcLoader('user-service') // load grpc controller
const rpc = grpcLoader.loadRPC({
  controllers: [UserController, ProfileController],
  middlewares: [KeyExchangeMiddleware], // before controller execution
  interceptors: [TransformResponseInterceptor] // after controller execution
})

server.addService(namespace.com.pkg.user.rpc.service, rpc)
server.bindAsync(
  `0.0.0.0:${process.env.PORT || 50051}`,
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('Server running at http://0.0.0.0:50051')
  }
)
const reflection = new ReflectionService(packageDefinition)
reflection.addToServer(server)

const health = new HealthImplementation()
health.setStatus('', 'SERVING')
health.addToServer(server)
```

`user.controller.ts`

```typescript
import { ServerUnaryCall } from '@grpc/grpc-js'
import { UserDTO } from './user.dto'
import { validate } from '@codeekage/grpc-js'
import { UserService } from './user.service'
export class UserController {
  constructor(private userService: UserService) {
    this.userService = new UserService()
  }

  @validate(UserDTO) // validates a dto
  async login(call: ServerUnaryCall<UserDTO, any>) {
    return this.userService.add(call.request)
  }
}
```

`user.dto.ts`

```typescript
import { IsDefined, IsEmail, IsString } from 'class-validator'

export class UserDTO {
  @IsEmail()
  @IsDefined()
  email: string

  @IsString()
  @IsDefined()
  password: string
}
```

Give it a try and share your feedbacks
