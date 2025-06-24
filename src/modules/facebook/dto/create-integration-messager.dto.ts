import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntegrationMessagerDto {
  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'code' })
  @IsNotEmpty({ message: 'Introduce un code.' })
  id: string;

  @ApiProperty({
    example:
      'cb=f7ca6bdbgt1fb76612&domain=localhost&is_canvas=false&origin=http%3A%2F%2Flocalhost%3A3000%2Ff00bff794ddfe771c&relation=opener&frame=f748e6aee17b890d4&code=AQCqVX112EJ5DFrMYW7i_p87z8XmtzAa_2R4ZtqPpU7uwOJcoOK_6IghKUMkVP52cygZLcryLyZelWrsq2hoc5MbQ43TofjYK3YAvf9RyvUcfjetZoSHo6wFu9Mk8Fl5gAucLGtajCOeYUFPa3Xn-NIagzNisOMa6303FBNAmEMyJfMb_UmPEZk4nJNvuAWY8lM2TdHmuTg6fC2VswOU7BDtsxaz1ml-bdURG894Or3tN4qvaI2lYFJQHUqB8xj8jPrxdEN9O00XKh3LQxMe2mBU5pfuQqj752eXcRIZSDwUwnwK5QN4YLRtXum1JS3fXJyPKhRQAVEx7Sb8YhInEHoXUkwFd_I7eRCJo5D-QkG_nR32nqIyr2kv4CigiOhm_HCFR9IXpQX9cQ8JAJiJMZIB&base_domain=',
    description: 'access_token',
  })
  @IsNotEmpty({ message: 'Introduce data.' })
  access_token: string;
}
