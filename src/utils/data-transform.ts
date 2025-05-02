const getAttributeValue = (attributes, traitType) => {
  return (
    _.chain(attributes)
      .values()
      .find({ trait_type: traitType })
      .get("value")
      .value() || null
  );
};

export { getAttributeValue };
