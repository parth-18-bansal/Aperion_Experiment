export const environment = {
  local      : false,
  dev        : true,
  stage      : false,
  demo       : false,
  prod       : false,
  version    : '1.1.5'
};

// production için      -> -> ->    production : true,  test: false
// development için     -> -> ->    production : false, test: false
// test için            -> -> ->    production : true,  test: true