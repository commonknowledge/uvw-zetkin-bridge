import { ZammadObjectProperty } from '../types';
import { zammad } from '../zammad';

export const expectedProperties: ZammadObjectProperty[] = [
  // {
  //   "name": "zetkin_member_number",
  //   "object": "User",
  //   "display": "Zetkin - Member Number",
  //   "active": true,
  //   "data_type": "input",
  //   "data_option": {
  //     "default": "",
  //     "type": "text",
  //     "maxlength": 120,
  //   },
  //   "screens": {
  //     "edit": {
  //       "ticket.agent": {
  //         "shown": true,
  //         "required": false
  //       },
  //       "admin.user": {
  //         "shown": true,
  //         "required": false
  //       }
  //     },
  //     "view": {
  //       "ticket.agent": {
  //         "shown": true
  //       },
  //       "admin.user": {
  //         "shown": true
  //       },
  //       "ticket.customer": {
  //         "shown": false
  //       }
  //     },
  //     "create": {
  //       "ticket.customer": {
  //         "shown": false,
  //         "required": false
  //       },
  //       "ticket.agent": {
  //         "shown": false,
  //         "required": false
  //       },
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "signup": {
  //       "ticket.customer": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "invite_customer": {
  //       "ticket.agent": {
  //         "shown": false,
  //         "required": false
  //       },
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "invite_agent": {
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     }
  //   }
  // },
  // {
  //   "name": "zetkin_url",
  //   "object": "User",
  //   "display": "Zetkin - Member Link",
  //   "active": true,
  //   "data_type": "input",
  //   "data_option": {
  //     "default": "",
  //     "type": "text",
  //     "maxlength": 1000,
  //   },
  //   "screens": {
  //     "edit": {
  //       "ticket.agent": {
  //         "shown": true,
  //         "required": false
  //       },
  //       "admin.user": {
  //         "shown": true,
  //         "required": false
  //       }
  //     },
  //     "view": {
  //       "ticket.agent": {
  //         "shown": true
  //       },
  //       "admin.user": {
  //         "shown": true
  //       },
  //       "ticket.customer": {
  //         "shown": false
  //       }
  //     },
  //     "create": {
  //       "ticket.customer": {
  //         "shown": false,
  //         "required": false
  //       },
  //       "ticket.agent": {
  //         "shown": false,
  //         "required": false
//       },p
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "signup": {
  //       "ticket.customer": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "invite_customer": {
  //       "ticket.agent": {
  //         "shown": false,
  //         "required": false
  //       },
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     },
  //     "invite_agent": {
  //       "admin.user": {
  //         "shown": false,
  //         "required": false
  //       }
  //     }
  //   }
  // },  
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
]

export const createFields = async () => {
  return Promise.all(
    expectedProperties.map(body => zammad.post('object_manager_attributes', { body }))
  )
}

export const migrateDb = async () => {
  return zammad.post('object_manager_attributes_execute_migrations')
}

(async () => {
  await createFields()
  await migrateDb()
  process.exit()
})()