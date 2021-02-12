import { ZammadObjectProperty } from '../types';
import { migrateZammadDb, upsertZammadObjectProperties } from '../zammad';
import { merge } from 'lodash';

export const expectedProperties: ZammadObjectProperty[] = [
  createProperty({
    name: "employer",
    object: "User"
  }),
  createProperty({
    name: "workplace_address",
    object: "User"
  }),
  createProperty({
    name: "job_title",
    object: "User"
  }),
  createProperty({
    name: "wage_salary",
    object: "User"
  }),
  createProperty({
    name: "hours",
    object: "User"
  }),
  createProperty({
    name: "number_of_colleagues",
    object: "User"
  }),
  {
    "name": "gocardless_number",
    "object": "User",
    "display": "GoCardless Customer Number",
    "active": true,
    "data_type": "input",
    "data_option": {
      "default": "",
      "type": "text",
      "maxlength": 1000,
    },
    "screens": {
      "edit": {
        "ticket.agent": {
          "shown": true,
          "required": false
        },
        "admin.user": {
          "shown": true,
          "required": false
        }
      },
      "view": {
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        },
        "ticket.customer": {
          "shown": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  },  
  {
    "name": "gocardless_url",
    "object": "User",
    "display": "GoCardless Customer Link",
    "active": true,
    "data_type": "input",
    "data_option": {
      "default": "",
      "type": "url",
      "maxlength": 1000,
    },
    "screens": {
      "edit": {
        "ticket.agent": {
          "shown": true,
          "required": false
        },
        "admin.user": {
          "shown": true,
          "required": false
        }
      },
      "view": {
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        },
        "ticket.customer": {
          "shown": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  },  
  {
    "name": "gocardless_status",
    "object": "User",
    "display": "GoCardless Subscription Status",
    "active": true,
    "data_type": "input",
    "data_option": {
      "default": "",
      "type": "text",
      "maxlength": 1000,
    },
    "screens": {
      "edit": {
        "ticket.agent": {
          "shown": true,
          "required": false
        },
        "admin.user": {
          "shown": true,
          "required": false
        }
      },
      "view": {
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        },
        "ticket.customer": {
          "shown": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  },  
  {
    "name": "gocardless_subscription",
    "object": "User",
    "display": "GoCardless Subscription Name",
    "active": true,
    "data_type": "input",
    "data_option": {
      "default": "",
      "type": "text",
      "maxlength": 120,
      "linktemplate": ""
    },
    "screens": {
      "edit": {
        "ticket.agent": {
          "shown": true,
          "required": false
        },
        "admin.user": {
          "shown": true,
          "required": false
        }
      },
      "view": {
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        },
        "ticket.customer": {
          "shown": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  },  
  {
    "name": "first_payment_date",
    "object": "User",
    "display": "GoCardless - First Payment",
    "active": true,
    "data_type": "date",
    "data_option": {
      "diff": 24
    },
    "screens": {
      "view": {
        "ticket.customer": {
          "shown": true
        },
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        }
      },
      "edit": {
        "admin.user": {
          "shown": true,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  },
  {
    "name": "last_payment_date",
    "object": "User",
    "display": "GoCardless - Last Payment",
    "active": true,
    "data_type": "date",
    "data_option": {
      "diff": 24
    },
    "screens": {
      "view": {
        "ticket.customer": {
          "shown": true
        },
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        }
      },
      "edit": {
        "admin.user": {
          "shown": true,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  }
];

type ZammadObjectPropertyUniqueFields = 'name' | 'object'

function createProperty (property: 
  Pick<ZammadObjectProperty, ZammadObjectPropertyUniqueFields> &
  Partial<Omit<ZammadObjectProperty, ZammadObjectPropertyUniqueFields>>
): ZammadObjectProperty {
  const _property = JSON.parse(JSON.stringify(property))
  const display = _property.display || _property.name
  delete _property.display

  return merge({
    // "name": "gocardless_number",
    // "object": "User",
    "display": display,
    "active": true,
    "data_type": "input",
    "data_option": {
      "default": "",
      "type": "text",
      "maxlength": 1000,
    },
    "screens": {
      "edit": {
        "ticket.agent": {
          "shown": true,
          "required": false
        },
        "admin.user": {
          "shown": true,
          "required": false
        }
      },
      "view": {
        "ticket.agent": {
          "shown": true
        },
        "admin.user": {
          "shown": true
        },
        "ticket.customer": {
          "shown": false
        }
      },
      "create": {
        "ticket.customer": {
          "shown": false,
          "required": false
        },
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "signup": {
        "ticket.customer": {
          "shown": false,
          "required": false
        }
      },
      "invite_customer": {
        "ticket.agent": {
          "shown": false,
          "required": false
        },
        "admin.user": {
          "shown": false,
          "required": false
        }
      },
      "invite_agent": {
        "admin.user": {
          "shown": false,
          "required": false
        }
      }
    }
  }, property)
}

(async () => {
  await upsertZammadObjectProperties(expectedProperties)
  await migrateZammadDb()
  process.exit()
})()