import React from 'react';
import { Page, Layout, CalloutCard } from '@shopify/polaris';
import { ResourcePicker } from '@shopify/app-bridge-react';

export default function Index() {
  const [openResourcePicker, setOpenResourcePicker] = React.useState(false);

  const handleSetProduct = async ({ Selection }) => {

  }

  return (
    <Page>
      <Layout.AnnotatedSection
        title="App Settings"
        description="Set up the product you want to add to each costumer's first order">
        <CalloutCard
          title='Select your thanks product'
          illustration='https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg'
          primaryAction={{
            content: "Select Product",
            onAction: () => setOpenResourcePicker(true)
          }}>
          <p>You have not selected any product yet.</p>
        </CalloutCard>
      </Layout.AnnotatedSection>

      <ResourcePicker
        resourceType='Product'
        open={openResourcePicker}
        onCancel={() => setOpenResourcePicker(false)}
        onSelection={handleSetProduct}
        allowMultiple={false}
        actionVerb='select'
      />
    </Page>
  );
}
