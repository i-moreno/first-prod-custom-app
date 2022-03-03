import React from 'react';
import { ImageMajor } from "@shopify/polaris-icons";
import { Page, Layout, CalloutCard, Frame, Loading, Card, Heading, ResourceList, ResourceItem, Thumbnail, TextStyle } from '@shopify/polaris';
import { ResourcePicker, Toast } from '@shopify/app-bridge-react';
import useSettingsManagement from './hooks/useSettingsManage';

export default function Index() {
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);
  const [openResourcePicker, setOpenResourcePicker] = React.useState(false);
  const { settingsObj, isLoading, error, isSetLoading, setSettings, clearError } = useSettingsManagement();

  const showToast = () => setShowSuccessToast(true);
  const hideToast = () => setShowSuccessToast(false);

  const showResourcePicker = () => setOpenResourcePicker(true);
  const hideResourcePicker = () => setOpenResourcePicker(false);

  const handleSetProduct = async ({ selection }) => {
    if (selection.length) {
      await setSettings(selection[0].id);
      showToast();
      hideResourcePicker();
    }
  }

  if (isLoading) {
    return (
      <Page>
        <div style={{ height: '100px' }}>
          <Frame>
            <Loading />
          </Frame>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Layout.AnnotatedSection
        title="App Settings"
        description="Set up the product you want to add to each costumer's first order">

        {settingsObj
          ? (
            <Card
              title={<Heading>Selected product</Heading>}
              primaryFooterAction={{
                content: "Select new product",
                onAction: showResourcePicker,
                loading: isSetLoading
              }}
              footerActionAlignment="left"
              sectioned>
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={[settingsObj]}
                renderItem={item => {
                  const { id, title, image } = item;
                  let imageSrc = image ? image.src : ImageMajor;

                  return (
                    <ResourceItem
                      id={id}
                      media={
                        <Thumbnail
                          size='small'
                          source={imageSrc}
                          alt={`Product ${title} thumbnail`}
                        />
                      }>
                      <h3>
                        <TextStyle variation='strong'>{title}</TextStyle>
                      </h3>
                    </ResourceItem>
                  );
                }}
              />
            </Card>
          )
          : (
            <CalloutCard
              title='Select your thanks product'
              illustration='https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg'
              primaryAction={{
                content: "Select Product",
                onAction: showResourcePicker
              }}>
              <p>You have not selected any product yet.</p>
            </CalloutCard>
          )}
      </Layout.AnnotatedSection>

      <ResourcePicker
        resourceType='Product'
        open={openResourcePicker}
        onCancel={() => setOpenResourcePicker(false)}
        onSelection={handleSetProduct}
        allowMultiple={false}
        actionVerb='select'
      />

      {showSuccessToast && (<Toast content='Settings updated' onDismiss={hideToast} />)}
      {error && <Toast content={error} onDismiss={clearError} />}
    </Page>
  );
}
