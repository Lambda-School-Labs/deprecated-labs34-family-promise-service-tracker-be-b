const { NotExtended } = require('http-errors');
const knex = require('../../data/db-config');

const findAll = async () => {
  return await knex('service_types')
    .leftJoin('service_providers', {
      'service_types.service_type_id': 'service_providers.service_type_id',
    })
    .leftJoin('profiles', {
      'service_providers.profile_id': 'profiles.profile_id',
    })
    .select(
      knex.raw('service_types.*, json_agg(profiles.*) as service_providers')
    )
    .groupBy('service_types.service_type_id');
};

const findById = async (id) => {
  return await knex('service_types')
    .leftJoin('service_providers', {
      'service_types.service_type_id': 'service_providers.service_type_id',
    })
    .leftJoin('profiles', {
      'service_providers.profile_id': 'profiles.profile_id',
    })
    .select(
      knex.raw('service_types.*, json_agg(profiles.*) as service_providers')
    )
    .where({ 'service_types.service_type_id': id })
    .groupBy('service_types.service_type_id')
    .first();
};

// const create = async (serviceType) => {
//   // separate out the service_providers array for junction table insert
//   const { service_providers, ...newServiceType } = serviceType;
//   // declare id variable for access across scopes
//   let newServiceTypeId;
//   try {
//     await knex.transaction(async (trx) => {
//       // first insert the serviceType object into service_types
//       const createdServiceType = await trx('service_types')
//         .insert(newServiceType)
//         .returning('*');

//       // set the ID of the returning DB record
//       newServiceTypeId = createdServiceType[0].service_type_id;

//       // if there are service providers that need to be associated
//       // with this type, insert them into junction table
//       if (service_providers && service_providers.length > 0) {
//         await trx('service_providers').insert(
//           service_providers.map((p) => {
//             console.log(newServiceTypeId)
//             console.log(p)
//             return { service_type_id: newServiceTypeId, profile_id: p };
//           })
//         );
//       }
//     });
//     // return promise with the new service type and associated providers
//     return await findById(newServiceTypeId);
//   } catch (err) {
//     // if transaction fails, forward the error to the router for handling
//     throw new Error(err);
//   }
// };
const create = async (serviceType) => {
  const { service_providers_arr, ...newServiceType } = serviceType;
  let newServiceTypeId
  try {
    const createdServiceType = await knex('service_types')
    .insert(newServiceType)
    .returning('*')
    newServiceTypeId = createdServiceType[0].service_type_id;
    console.log(newServiceTypeId)
    if (service_providers_arr && service_providers_arr.length > 0) {
      while (service_providers_arr.length > 0){
        console.log(service_providers_arr)
        await knex('service_providers').insert({
          service_type_id: newServiceTypeId,
          profile_id: service_providers_arr[service_providers_arr.length - 1]
        })
        service_providers_arr.pop()
      }
    }
    // if (service_providers && service_providers.length > 0) {
    //   await knex('service_providers')
    //   .insert(service_providers.map((p) => {
    //     return { service_type_id: newServiceTypeId, profile_id: p };
    //   }))
    // }
    return await findById(newServiceTypeId);
  }catch(err){
    throw new Error(err)
  }
}

const update = async (id, updates) => {
  // separate out the service_providers array for junction table insert
  const { service_providers, ...serviceType } = updates;

  try {
    await knex.transaction(async (trx) => {
      // only make updates to service_types table if request includes updates
      if (Object.keys(serviceType).length > 0) {
        await trx('service_types').where('service_type_id', id).first().update(serviceType);
      }

      // if request includes providers_array, wipe existing associations
      if (service_providers) {
        await trx('services_providers').where('service_type_id', id).delete();
      }
      // then insert new associations if there are any
      if (service_providers && service_providers.length > 0) {
        await trx('services_providers').insert(
          service_providers.map((p) => {
            return { service_type_id: id, provider_id: p };
          })
        );
      }
    });
    // return promise with the updated service type and associated providers
    return await findById(id);
  } catch (err) {
    // if transaction fails, forward the error to the router for handling
    throw new Error(err);
  }
};

const remove = async (id) => {
  await knex('service_providers').where('service_type_id', id).del()
  await knex('service_types').where('service_type_id', id).del();
  return id
}

module.exports = {
  knex,
  findAll,
  findById,
  create,
  update,
  remove
};
