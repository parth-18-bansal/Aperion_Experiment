export const environment = {
  local      : false,
  dev        : false,
  stage      : false,
  demo       : true,
  prod       : false,
  version    : '1.0.5'
};

// production için      -> -> ->    production : true,  test: false
// development için     -> -> ->    production : false, test: false
// test için            -> -> ->    production : true,  test: true