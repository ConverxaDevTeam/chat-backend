import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function ArrayLength(length: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'arrayLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [length],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Array.isArray(value) && value.length === args.constraints[0];
        },
        defaultMessage(args: ValidationArguments) {
          return `The array ${args.property} must contain exactly ${args.constraints[0]} elements.`;
        },
      },
    });
  };
}
