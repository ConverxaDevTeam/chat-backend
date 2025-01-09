import { EntitySubscriberInterface, EventSubscriber, DataSource, SoftRemoveEvent } from 'typeorm';
import { UserOrganization } from '@models/UserOrganization.entity';
import { Organization } from '@models/Organization.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
@EventSubscriber()
export class OrganizationSubscriber implements EntitySubscriberInterface<Organization> {
  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Organization;
  }

  async beforeSoftRemove(event: SoftRemoveEvent<Organization>) {
    if (event.entity) {
      await this.dataSource.getRepository(UserOrganization).softDelete({ organization: { id: event.entity.id } });
    }
  }
}
